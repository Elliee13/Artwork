from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.models import CatalogResponse
from app.services.catalog_service import CatalogBuildResult, CatalogService
from app.services.graph_client import GraphClient


logger = logging.getLogger(__name__)
settings = get_settings()
settings.static_dir.mkdir(parents=True, exist_ok=True)
settings.media_dir.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Artwork Viewer API")


def log_json(event: str, **fields: object) -> None:
    payload = {"event": event, **fields}
    logger.info(json.dumps(payload, separators=(",", ":"), default=str))


@dataclass
class CatalogCacheEntry:
    key: str
    expires_at: float
    response: CatalogResponse
    workbook_source: str
    workbook_identity: str
    extraction_ms: int
    total_images: int
    category_stats: list[dict[str, object]]


catalog_cache_entry: CatalogCacheEntry | None = None
catalog_cache_lock = asyncio.Lock()
allowed_origins = frozenset(settings.allowed_origins_list)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        return response


class ForceCORSMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, allowed: frozenset[str]) -> None:
        super().__init__(app)
        self.allowed_origins = allowed

    async def dispatch(self, request: Request, call_next):
        request_origin = request.headers.get("origin", "").strip().rstrip("/")
        is_allowed_origin = request_origin in self.allowed_origins

        if request.method == "OPTIONS" and is_allowed_origin:
            response = Response(status_code=204)
        else:
            response = await call_next(request)

        if is_allowed_origin:
            response.headers["Access-Control-Allow-Origin"] = request_origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"

        return response


def _catalog_cache_key(identity: str) -> str:
    return f"{settings.source_mode}:{identity}"


def _sum_images(categories: list[dict[str, object]]) -> int:
    return sum(int(category.get("images_count", 0)) for category in categories)


def _as_catalog_response(build_result: CatalogBuildResult) -> CatalogResponse:
    return CatalogResponse(categories=build_result.categories)


app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ForceCORSMiddleware, allowed=allowed_origins)

app.mount("/static", StaticFiles(directory=settings.static_dir), name="static")
# Keep a prefixed static mount for serverless platforms that preserve `/api` in the path.
app.mount("/api/static", StaticFiles(directory=settings.static_dir), name="api-static")

graph_client = GraphClient(settings=settings) if settings.source_mode == "graph" else None
catalog_service = CatalogService(settings=settings, graph_client=graph_client)


@app.get("/catalog", response_model=CatalogResponse)
@app.get("/api/catalog", response_model=CatalogResponse, include_in_schema=False)
async def get_catalog(
    request: Request,
    response: Response,
    refresh: int = Query(default=0),
) -> CatalogResponse:
    global catalog_cache_entry

    request_started = time.perf_counter()
    request_id = getattr(request.state, "request_id", "")
    force_refresh = refresh == 1
    cache_ttl = max(settings.catalog_cache_ttl_seconds, 0)
    cache_status = "MISS"

    # Conservative cache headers for browser/CDN to reduce repeated fetch pressure.
    response.headers["Cache-Control"] = "private, max-age=10"
    response.headers["CDN-Cache-Control"] = "max-age=60"

    peek_identity = catalog_service.peek_workbook_identity()
    peek_key = _catalog_cache_key(peek_identity)
    now = time.time()

    if not force_refresh and cache_ttl > 0 and catalog_cache_entry:
        if catalog_cache_entry.key == peek_key and catalog_cache_entry.expires_at > now:
            cache_status = "HIT"
            response.headers["X-Catalog-Cache"] = cache_status
            total_ms = int((time.perf_counter() - request_started) * 1000)
            log_json(
                "catalog_request",
                request_id=request_id,
                path=request.url.path,
                method=request.method,
                source_mode=settings.source_mode,
                workbook_source=catalog_cache_entry.workbook_source,
                workbook_identity=catalog_cache_entry.workbook_identity,
                categories=len(catalog_cache_entry.response.categories),
                total_images=catalog_cache_entry.total_images,
                per_category=catalog_cache_entry.category_stats,
                extraction_ms=0,
                total_ms=total_ms,
                cache_status=cache_status,
            )
            return catalog_cache_entry.response

    async with catalog_cache_lock:
        now = time.time()
        peek_identity = catalog_service.peek_workbook_identity()
        peek_key = _catalog_cache_key(peek_identity)

        if (
            not force_refresh
            and cache_ttl > 0
            and catalog_cache_entry
            and catalog_cache_entry.key == peek_key
            and catalog_cache_entry.expires_at > now
        ):
            cache_status = "HIT"
            response.headers["X-Catalog-Cache"] = cache_status
            total_ms = int((time.perf_counter() - request_started) * 1000)
            log_json(
                "catalog_request",
                request_id=request_id,
                path=request.url.path,
                method=request.method,
                source_mode=settings.source_mode,
                workbook_source=catalog_cache_entry.workbook_source,
                workbook_identity=catalog_cache_entry.workbook_identity,
                categories=len(catalog_cache_entry.response.categories),
                total_images=catalog_cache_entry.total_images,
                per_category=catalog_cache_entry.category_stats,
                extraction_ms=0,
                total_ms=total_ms,
                cache_status=cache_status,
            )
            return catalog_cache_entry.response

        try:
            build_result = await catalog_service.build_catalog_result()
            catalog_response = _as_catalog_response(build_result)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Catalog generation failed: {exc}") from exc

        response.headers["X-Catalog-Cache"] = "BYPASS" if force_refresh else "MISS"
        cache_status = response.headers["X-Catalog-Cache"]
        key = _catalog_cache_key(build_result.workbook_identity)

        if cache_ttl > 0:
            catalog_cache_entry = CatalogCacheEntry(
                key=key,
                expires_at=time.time() + cache_ttl,
                response=catalog_response,
                workbook_source=build_result.workbook_source,
                workbook_identity=build_result.workbook_identity,
                extraction_ms=build_result.extraction_ms,
                total_images=build_result.total_images,
                category_stats=build_result.category_stats,
            )
        else:
            catalog_cache_entry = None

        total_ms = int((time.perf_counter() - request_started) * 1000)
        log_json(
            "catalog_request",
            request_id=request_id,
            path=request.url.path,
            method=request.method,
            source_mode=settings.source_mode,
            workbook_source=build_result.workbook_source,
            workbook_identity=build_result.workbook_identity,
            categories=len(catalog_response.categories),
            total_images=_sum_images(build_result.categories),
            per_category=build_result.category_stats,
            extraction_ms=build_result.extraction_ms,
            total_ms=total_ms,
            cache_status=cache_status,
        )
        return catalog_response


@app.get("/health/graph")
@app.get("/api/health/graph", include_in_schema=False)
async def graph_health() -> dict[str, object]:
    if settings.source_mode != "graph":
        return {"mode": "local", "status": "disabled"}

    missing = settings.graph_missing_config_fields()
    if missing:
        return {"mode": "graph", "status": "missing_config", "missing": missing}

    try:
        if graph_client is None:
            return {"mode": "graph", "status": "error", "error": "Graph client is not configured."}
        workbook_bytes = await graph_client.download_excel_file()
        return {"mode": "graph", "status": "ok", "bytes": len(workbook_bytes)}
    except Exception as exc:
        return {"mode": "graph", "status": "error", "error": str(exc)}


@app.get("/media/{category}/{filename}")
@app.get("/api/media/{category}/{filename}", include_in_schema=False)
async def get_media(category: str, filename: str, request: Request) -> Response:
    request_started = time.perf_counter()
    request_id = getattr(request.state, "request_id", "")
    if_none_match = request.headers.get("if-none-match", "").strip()

    try:
        media_result = await catalog_service.get_media_image(category=category, filename=filename)
        headers = {
            "Cache-Control": "public, max-age=31536000, immutable",
            "ETag": media_result.etag,
        }

        if if_none_match and if_none_match == media_result.etag:
            response = Response(status_code=304, headers=headers)
        else:
            response = Response(content=media_result.content, media_type="image/png", headers=headers)

        total_ms = int((time.perf_counter() - request_started) * 1000)
        log_json(
            "media_request",
            request_id=request_id,
            path=request.url.path,
            method=request.method,
            source_mode=settings.source_mode,
            workbook_source=media_result.workbook_source,
            workbook_identity=media_result.workbook_identity,
            category=category,
            filename=filename,
            cache_hit=media_result.cache_hit,
            status_code=response.status_code,
            total_ms=total_ms,
        )
        return response
    except FileNotFoundError:
        total_ms = int((time.perf_counter() - request_started) * 1000)
        log_json(
            "media_request",
            request_id=request_id,
            path=request.url.path,
            method=request.method,
            source_mode=settings.source_mode,
            category=category,
            filename=filename,
            status_code=404,
            total_ms=total_ms,
        )
        raise HTTPException(status_code=404, detail="Media not found.")
    except Exception as exc:
        total_ms = int((time.perf_counter() - request_started) * 1000)
        log_json(
            "media_request",
            request_id=request_id,
            path=request.url.path,
            method=request.method,
            source_mode=settings.source_mode,
            category=category,
            filename=filename,
            status_code=500,
            total_ms=total_ms,
            error=str(exc),
        )
        raise HTTPException(status_code=500, detail=f"Media retrieval failed: {exc}") from exc

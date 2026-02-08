from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.models import CatalogResponse
from app.services.catalog_service import CatalogService
from app.services.graph_client import GraphClient


settings = get_settings()
settings.static_dir.mkdir(parents=True, exist_ok=True)
settings.media_dir.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Artwork Viewer API")

allowed_origins = frozenset(settings.allowed_origins_list)


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

graph_client = None if settings.local_xlsx_path else GraphClient(settings=settings)
catalog_service = CatalogService(settings=settings, graph_client=graph_client)


@app.get("/catalog", response_model=CatalogResponse)
@app.get("/api/catalog", response_model=CatalogResponse, include_in_schema=False)
async def get_catalog() -> CatalogResponse:
    try:
        categories = await catalog_service.build_catalog()
        return CatalogResponse(categories=categories)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Catalog generation failed: {exc}") from exc

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.models import CatalogResponse
from app.services.catalog_service import CatalogService
from app.services.graph_client import GraphClient


settings = get_settings()
settings.static_dir.mkdir(parents=True, exist_ok=True)
settings.media_dir.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Artwork Viewer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=settings.static_dir), name="static")

graph_client = None if settings.local_xlsx_path else GraphClient(settings=settings)
catalog_service = CatalogService(settings=settings, graph_client=graph_client)


@app.get("/api/catalog", response_model=CatalogResponse)
async def get_catalog() -> CatalogResponse:
    try:
        categories = await catalog_service.build_catalog()
        return CatalogResponse(categories=categories)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Catalog generation failed: {exc}") from exc

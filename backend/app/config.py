from __future__ import annotations

from functools import lru_cache
import os
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    source_mode: Literal["local", "graph"] = Field(default="local", alias="SOURCE_MODE")

    graph_tenant_id: str | None = Field(default=None, alias="MS_TENANT_ID")
    graph_client_id: str | None = Field(default=None, alias="MS_CLIENT_ID")
    graph_client_secret: str | None = Field(default=None, alias="MS_CLIENT_SECRET")
    graph_file_url: str | None = Field(default=None, alias="MS_FILE_URL")
    ms_drive_id: str | None = Field(default=None, alias="MS_DRIVE_ID")
    ms_item_id: str | None = Field(default=None, alias="MS_ITEM_ID")

    # Legacy compatibility (kept optional and used as fallback).
    graph_drive_id: str | None = Field(default=None, alias="GRAPH_DRIVE_ID")
    graph_item_id: str | None = Field(default=None, alias="GRAPH_ITEM_ID")

    graph_site_id: str | None = Field(default=None, alias="GRAPH_SITE_ID")
    graph_file_path: str | None = Field(default=None, alias="GRAPH_FILE_PATH")

    graph_scopes: str = Field(default="https://graph.microsoft.com/.default", alias="GRAPH_SCOPES")
    graph_base_url: str = Field(default="https://graph.microsoft.com/v1.0", alias="GRAPH_BASE_URL")
    graph_timeout_seconds: int = Field(default=30, alias="GRAPH_TIMEOUT_SECONDS")

    local_xlsx_path: str | None = Field(default=None, alias="LOCAL_XLSX_PATH")
    static_root: str | None = Field(default=None, alias="STATIC_ROOT")
    catalog_cache_ttl_seconds: int = Field(default=120, alias="CATALOG_CACHE_TTL_SECONDS")

    allowed_origins: str = Field(default="http://localhost:5173", alias="ALLOWED_ORIGINS")

    @property
    def base_dir(self) -> Path:
        return Path(__file__).resolve().parents[1]

    @property
    def static_dir(self) -> Path:
        # Vercel serverless file system is read-only except /tmp.
        if self.static_root:
            return Path(self.static_root)
        if os.getenv("VERCEL"):
            return Path("/tmp/static")
        return self.base_dir / "static"

    @property
    def media_dir(self) -> Path:
        return self.static_dir / "media"

    @property
    def effective_drive_id(self) -> str | None:
        return self.ms_drive_id or self.graph_drive_id

    @property
    def effective_item_id(self) -> str | None:
        return self.ms_item_id or self.graph_item_id

    @property
    def allowed_origins_list(self) -> list[str]:
        origins: list[str] = []
        for origin in self.allowed_origins.split(","):
            normalized_origin = origin.strip().rstrip("/")
            if normalized_origin:
                origins.append(normalized_origin)
        return origins

    def graph_missing_config_fields(self) -> list[str]:
        missing: list[str] = []
        if not self.graph_tenant_id:
            missing.append("MS_TENANT_ID")
        if not self.graph_client_id:
            missing.append("MS_CLIENT_ID")
        if not self.graph_client_secret:
            missing.append("MS_CLIENT_SECRET")

        has_file_url = bool(self.graph_file_url)
        has_drive_item = bool(self.effective_drive_id and self.effective_item_id)
        if not has_file_url and not has_drive_item:
            missing.append("MS_FILE_URL or (MS_DRIVE_ID + MS_ITEM_ID)")

        return missing

    @model_validator(mode="after")
    def validate_workbook_source(self) -> "Settings":
        if self.source_mode == "local":
            if not self.local_xlsx_path:
                raise ValueError("LOCAL_XLSX_PATH is required when SOURCE_MODE=local.")
            return self

        # Graph config is validated by the health endpoint/runtime path so
        # server startup remains resilient with partial configuration.
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()

from __future__ import annotations

from functools import lru_cache
import os
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    graph_tenant_id: str | None = Field(default=None, alias="MS_TENANT_ID")
    graph_client_id: str | None = Field(default=None, alias="MS_CLIENT_ID")
    graph_client_secret: str | None = Field(default=None, alias="MS_CLIENT_SECRET")

    graph_drive_id: str | None = Field(default=None, alias="GRAPH_DRIVE_ID")
    graph_item_id: str | None = Field(default=None, alias="GRAPH_ITEM_ID")

    graph_site_id: str | None = Field(default=None, alias="GRAPH_SITE_ID")
    graph_file_path: str | None = Field(default=None, alias="GRAPH_FILE_PATH")

    graph_scopes: str = Field(default="https://graph.microsoft.com/.default", alias="GRAPH_SCOPES")
    graph_base_url: str = Field(default="https://graph.microsoft.com/v1.0", alias="GRAPH_BASE_URL")
    graph_timeout_seconds: int = Field(default=30, alias="GRAPH_TIMEOUT_SECONDS")

    local_xlsx_path: str | None = Field(default=None, alias="LOCAL_XLSX_PATH")
    static_root: str | None = Field(default=None, alias="STATIC_ROOT")

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
    def allowed_origins_list(self) -> list[str]:
        origins: list[str] = []
        for origin in self.allowed_origins.split(","):
            normalized_origin = origin.strip().rstrip("/")
            if normalized_origin:
                origins.append(normalized_origin)
        return origins

    @model_validator(mode="after")
    def validate_workbook_source(self) -> "Settings":
        has_local_ref = bool(self.local_xlsx_path)
        has_drive_ref = bool(self.graph_drive_id and self.graph_item_id)
        has_site_path_ref = bool(self.graph_site_id and self.graph_file_path)
        has_any_drive_field = bool(self.graph_drive_id or self.graph_item_id)
        has_any_site_field = bool(self.graph_site_id or self.graph_file_path)

        if has_local_ref:
            return self

        if has_any_drive_field and not has_drive_ref:
            raise ValueError(
                "GRAPH_DRIVE_ID and GRAPH_ITEM_ID must both be set when using drive item mode."
            )

        if has_any_site_field and not has_site_path_ref:
            raise ValueError(
                "GRAPH_SITE_ID and GRAPH_FILE_PATH must both be set when using site path mode."
            )

        if (has_drive_ref or has_site_path_ref) and not (
            self.graph_tenant_id and self.graph_client_id and self.graph_client_secret
        ):
            raise ValueError(
                "Graph mode requires MS_TENANT_ID, MS_CLIENT_ID, and MS_CLIENT_SECRET."
            )

        return self

@lru_cache
def get_settings() -> Settings:
    return Settings()

from __future__ import annotations

import time
from urllib.parse import quote

import httpx

from app.config import Settings


class GraphClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._token: str | None = None
        self._token_expires_at: float = 0

    async def _get_access_token(self) -> str:
        if self._token and (self._token_expires_at - time.time()) > 60:
            return self._token

        if not (
            self.settings.graph_tenant_id
            and self.settings.graph_client_id
            and self.settings.graph_client_secret
        ):
            raise RuntimeError(
                "Missing Graph credentials. Set MS_TENANT_ID, MS_CLIENT_ID, and MS_CLIENT_SECRET."
            )

        token_url = (
            f"https://login.microsoftonline.com/{self.settings.graph_tenant_id}/oauth2/v2.0/token"
        )
        payload = {
            "client_id": self.settings.graph_client_id,
            "client_secret": self.settings.graph_client_secret,
            "scope": self.settings.graph_scopes,
            "grant_type": "client_credentials",
        }

        async with httpx.AsyncClient(timeout=self.settings.graph_timeout_seconds) as client:
            response = await client.post(token_url, data=payload)

        if response.status_code != 200:
            raise RuntimeError(f"Graph token request failed: {response.status_code} {response.text}")

        token_data = response.json()
        self._token = token_data["access_token"]
        self._token_expires_at = time.time() + int(token_data.get("expires_in", 3600))
        return self._token

    async def download_excel_file(self) -> bytes:
        token = await self._get_access_token()

        if self.settings.graph_drive_id and self.settings.graph_item_id:
            url = (
                f"{self.settings.graph_base_url}/drives/{quote(self.settings.graph_drive_id)}"
                f"/items/{quote(self.settings.graph_item_id)}/content"
            )
        else:
            file_path = (self.settings.graph_file_path or "").strip("/")
            encoded_path = quote(file_path, safe="/")
            url = (
                f"{self.settings.graph_base_url}/sites/{quote(self.settings.graph_site_id or '')}"
                f"/drive/root:/{encoded_path}:/content"
            )

        headers = {"Authorization": f"Bearer {token}"}

        async with httpx.AsyncClient(timeout=self.settings.graph_timeout_seconds) as client:
            response = await client.get(url, headers=headers)

        if response.status_code != 200:
            raise RuntimeError(f"Excel download failed: {response.status_code} {response.text}")

        return response.content

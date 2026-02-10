from __future__ import annotations

import base64
import re
import time
from urllib.parse import quote, unquote, urlparse

import httpx

from app.config import Settings


DRIVE_ITEM_PATTERN = re.compile(r"/drives/([^/]+)/items/([^/]+)")


class GraphClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._token: str | None = None
        self._token_expires_at: float = 0
        self._timeout = httpx.Timeout(connect=10.0, read=10.0, write=10.0, pool=10.0)

    @staticmethod
    def _encode_share_url(share_url: str) -> str:
        encoded = base64.urlsafe_b64encode(share_url.encode("utf-8")).decode("utf-8").rstrip("=")
        return f"u!{encoded}"

    async def _get_access_token(self) -> str:
        if self._token and (self._token_expires_at - time.time()) > 60:
            return self._token

        if not (self.settings.graph_tenant_id and self.settings.graph_client_id and self.settings.graph_client_secret):
            raise RuntimeError("Graph credentials are missing.")

        token_url = (
            f"https://login.microsoftonline.com/{self.settings.graph_tenant_id}/oauth2/v2.0/token"
        )
        payload = {
            "client_id": self.settings.graph_client_id,
            "client_secret": self.settings.graph_client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials",
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(token_url, data=payload)

        if response.status_code != 200:
            raise RuntimeError(f"Graph token request failed ({response.status_code}).")

        token_data = response.json()
        token = token_data.get("access_token")
        if not isinstance(token, str) or not token:
            raise RuntimeError("Graph token response missing access_token.")

        self._token = token
        self._token_expires_at = time.time() + int(token_data.get("expires_in", 3600))
        return token

    async def _get_json(self, url: str, token: str) -> dict:
        headers = {"Authorization": f"Bearer {token}"}
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(url, headers=headers)

        if response.status_code >= 400:
            raise RuntimeError(f"Graph request failed ({response.status_code}).")
        return response.json()

    async def _download_from_url(self, url: str, token: str) -> bytes:
        headers = {"Authorization": f"Bearer {token}"}
        async with httpx.AsyncClient(timeout=self._timeout, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)

        if response.status_code >= 400:
            raise RuntimeError(f"Graph file download failed ({response.status_code}).")
        return response.content

    async def _download_from_drive_item(self, drive_id: str, item_id: str, token: str) -> bytes:
        content_url = (
            f"{self.settings.graph_base_url}/drives/{quote(drive_id)}/items/{quote(item_id)}/content"
        )
        return await self._download_from_url(content_url, token)

    async def _download_using_file_url(self, token: str) -> bytes:
        file_url = (self.settings.graph_file_url or "").strip()
        if not file_url:
            raise RuntimeError("MS_FILE_URL is not configured.")

        parsed = urlparse(file_url)
        hostname = (parsed.hostname or "").lower()
        graph_host = "graph.microsoft.com" in hostname

        if graph_host:
            match = DRIVE_ITEM_PATTERN.search(parsed.path)
            if match:
                drive_id = unquote(match.group(1))
                item_id = unquote(match.group(2))
                return await self._download_from_drive_item(drive_id, item_id, token)

            if parsed.path.endswith("/content"):
                return await self._download_from_url(file_url, token)

        # Treat non-Graph URLs as OneDrive/SharePoint sharing links.
        share_id = self._encode_share_url(file_url)
        drive_item_url = f"{self.settings.graph_base_url}/shares/{share_id}/driveItem"
        drive_item = await self._get_json(drive_item_url, token)

        item_id = drive_item.get("id")
        parent_reference = drive_item.get("parentReference") or {}
        drive_id = parent_reference.get("driveId")
        if not item_id or not drive_id:
            raise RuntimeError("Unable to resolve drive item from MS_FILE_URL.")

        return await self._download_from_drive_item(str(drive_id), str(item_id), token)

    async def download_excel_file(self) -> bytes:
        token = await self._get_access_token()

        if self.settings.graph_file_url:
            return await self._download_using_file_url(token)

        drive_id = self.settings.effective_drive_id
        item_id = self.settings.effective_item_id
        if drive_id and item_id:
            return await self._download_from_drive_item(drive_id, item_id, token)

        raise RuntimeError("Graph file locator is missing. Configure MS_FILE_URL or MS_DRIVE_ID + MS_ITEM_ID.")

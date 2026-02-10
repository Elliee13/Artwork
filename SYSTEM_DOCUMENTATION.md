# Artwork Viewer - System Documentation

## 1) Purpose
Internal, view-only gallery app for browsing artwork images grouped by Excel worksheet category.

Core behavior:
- Each worksheet tab is treated as one category.
- Selecting a category shows all extractable images from that worksheet.
- No edit/upload/delete/search/auth workflows are in scope.

## 2) Architecture
- Frontend: React + TypeScript + Tailwind (Vite)
- Backend: FastAPI (Vercel serverless compatible)
- Excel parsing/extraction: `openpyxl` + `Pillow`
- Optional remote source: Microsoft Graph API (behind source mode flag)

## 3) Source Modes
Source selection is controlled by `SOURCE_MODE`.

### Local mode (default)
- `SOURCE_MODE=local`
- `LOCAL_XLSX_PATH=artwork.xlsx` (or absolute path)

### Graph mode (optional)
- `SOURCE_MODE=graph`
- `MS_TENANT_ID`
- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`
- `MS_DRIVE_ID`
- `MS_ITEM_ID`

Recommended Graph path pattern:
- `GET https://graph.microsoft.com/v1.0/drives/{driveId}/items/{itemId}/content`

## 4) Backend API

### Catalog
- Primary: `GET /catalog`
- Compatibility alias: `GET /api/catalog`

Query params:
- `refresh=1` bypasses in-process catalog cache and forces rebuild.

Response shape (unchanged):
```json
{
  "categories": [
    {
      "name": "KIDS",
      "images": ["/api/media/KIDS/img_1.png"],
      "images_count": 1,
      "unsupported_objects_detected": false,
      "notes": null
    }
  ]
}
```

### Media
- Primary: `GET /media/{category}/{filename}`
- Compatibility alias: `GET /api/media/{category}/{filename}`

File guardrails:
- `category` must match safe slug pattern.
- `filename` must match `img_<n>.png`.
- Invalid category/filename returns `404`.

### Graph health
- `GET /health/graph`
- `GET /api/health/graph`

Possible responses:
- `{"mode":"local","status":"disabled"}`
- `{"mode":"graph","status":"missing_config","missing":[...]}`
- `{"mode":"graph","status":"ok","bytes":12345}`
- `{"mode":"graph","status":"error","error":"..."}`

## 5) Caching and Identity

### Workbook identity
A stable workbook identity is computed from:
- workbook path
- file `mtime_ns`
- file size

Graph mode enhancement:
- identity may include an additional content signature (hash of first 64KB) to reduce false equivalence when rewritten.

### Catalog cache
- In-process TTL cache for catalog JSON.
- Env: `CATALOG_CACHE_TTL_SECONDS` (default `120`; set `0` to disable cache).
- Cache key includes `SOURCE_MODE` + workbook identity.
- `refresh=1` always bypasses cache.

Catalog response headers:
- `Cache-Control: private, max-age=10`
- `CDN-Cache-Control: max-age=60`
- `X-Catalog-Cache: HIT | MISS | BYPASS`

### Media cache
- Extracted images are cached under `/tmp/artwork_cache/<category>/img_<n>.png`.
- Sidecar metadata files (`img_<n>.meta`) store workbook identity.
- Media ETag is based on workbook identity + filename (and file stat).
- Conditional GET with `If-None-Match` returns `304` when applicable.

Media response headers:
- `Content-Type: image/png`
- `Cache-Control: public, max-age=31536000, immutable`
- `ETag: ...`

### Stale media invalidation
On catalog rebuild:
- If workbook identity changed from the last built identity, stale media cache is invalidated.
- Only files matching `img_<n>.png` and `img_<n>.meta` are removed.
- Category directories are removed only when empty.
- Invalidation is logged with old identity, new identity, cleaned category dirs, and removal counts.

## 6) Logging and Observability
- Each request gets a generated request id.
- Response header: `X-Request-Id`.
- Structured JSON logs are emitted for:
  - catalog requests (`catalog_request`)
  - media requests (`media_request`)
  - media cache invalidation (`media_cache_invalidation`)

Logs intentionally avoid secrets/tokens.

## 7) Frontend Behavior
- Uses backend catalog and media URLs directly.
- Category tabs show image count badges.
- Gallery uses Masonry layout.
- Clicking an image opens a lightbox dialog with next/previous navigation.
- Optional status panel (dev-only by default, or `VITE_SHOW_STATUS_PANEL=1`) shows API/debug info and has a refresh button that calls `?refresh=1`.

## 8) Local Runbook

### Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Local URLs:
- Frontend: `http://localhost:5173`
- Backend catalog: `http://localhost:8000/api/catalog`

## 9) Vercel Deployment Notes
- Deploy as two projects:
  - Backend root dir: `backend`
  - Frontend root dir: `frontend`
- Backend serverless entrypoint: `backend/api/index.py`
- Vercel writable filesystem is `/tmp` only.

Key backend env vars:
- `SOURCE_MODE=local`
- `LOCAL_XLSX_PATH=artwork.xlsx`
- `CATALOG_CACHE_TTL_SECONDS=120`
- `ALLOWED_ORIGINS=https://<frontend-domain>.vercel.app`

Key frontend env vars:
- `VITE_API_BASE_URL=https://<backend-domain>.vercel.app/api`
- `VITE_SHOW_STATUS_PANEL=0`

## 10) Known Limitations
- Non-standard worksheet objects (for example cells showing `#UNKNOWN!`) may not be extractable through `openpyxl` image APIs.
- In those cases categories may have zero extractable images and include diagnostic notes.

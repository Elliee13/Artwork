# Vercel Deployment (v1)

This repository is prepared for deployment as **two Vercel projects**:

1. `artwork-viewer-backend` (root directory: `backend`)
2. `artwork-viewer-frontend` (root directory: `frontend`)

This keeps deployment simple and preserves current architecture.

## 1) Backend Project (`backend/`)

### What is configured
- FastAPI serverless entrypoint for Vercel: `backend/api/index.py`
- Writable runtime static directory support (`/tmp/static`) via `backend/app/config.py`

### Vercel setup
1. Create a new Vercel project.
2. Select this repository.
3. Set **Root Directory** to `backend`.
4. Keep framework as `Other`.
5. Deploy.

### Backend environment variables (Vercel Project Settings)
For current local-workbook mode:
- `LOCAL_XLSX_PATH=artwork.xlsx`
- `CATALOG_CACHE_TTL_SECONDS=120`
- `ALLOWED_ORIGINS=https://<your-frontend-domain>.vercel.app`

Optional:
- `STATIC_ROOT=/tmp/static` (auto-handled on Vercel if omitted)

If switching to Graph mode later, set Graph variables and clear `LOCAL_XLSX_PATH`.

Recommended Graph file locator (stable for production):
- Use Drive/Item IDs:
  - `MS_DRIVE_ID`
  - `MS_ITEM_ID`
- Graph download shape:
  - `GET https://graph.microsoft.com/v1.0/drives/{driveId}/items/{itemId}/content`

Reference template:
- `backend/.env.vercel.example`

## 2) Frontend Project (`frontend/`)

### Vercel setup
1. Create a second Vercel project.
2. Select this repository.
3. Set **Root Directory** to `frontend`.
4. Framework preset should detect Vite.
5. Set env var:
   - `VITE_API_BASE_URL=https://<your-backend-domain>.vercel.app/api`
   - `VITE_SHOW_STATUS_PANEL=0` (set `1` only when debug panel is needed)
6. Deploy.

Reference template:
- `frontend/.env.production.example`

## 3) Post-deploy verification
1. Open frontend URL.
2. Confirm categories render.
3. Switch categories and confirm image loading.
4. Check backend health directly:
   - `https://<backend-domain>.vercel.app/api/catalog`

## 4) Notes for v1
- The backend extracts images on demand and serves URLs under `/static/...`.
- On Vercel, runtime files are generated in writable temp storage (`/tmp`).
- Keep `artwork.xlsx` present in `backend/` for local-workbook mode deployment.
- Catalog endpoint supports cache bypass: `GET /api/catalog?refresh=1`.
- Catalog responses use conservative cache headers:
  - `Cache-Control: private, max-age=10`
  - `CDN-Cache-Control: max-age=60`
- Media cache behavior:
  - Extracted images are cached under `/tmp/artwork_cache/<category>/img_<n>.png`
  - When workbook identity changes, cached `img_<n>.png` / `img_<n>.meta` files are invalidated
  - Media responses include ETag based on workbook identity + filename, so clients re-fetch after workbook updates

## 5) Troubleshooting

### Error: `spawn /usr/local/bin/uv ENOENT`
If your build log shows paths like `/vercel/path0/backend/...`, Vercel is building from the repository root instead of `backend`.

Fix:
1. In the backend Vercel project, set **Root Directory** to `backend`.
2. Make sure `backend/vercel.json` is present (it forces the stable `@vercel/python` builder path for this project layout).
3. Redeploy with **Clear build cache**.

Optional but recommended:
- Keep `backend/.python-version` set to `3.12`.

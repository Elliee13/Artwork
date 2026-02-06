# Vercel Deployment (v1)

This repository is prepared for deployment as **two Vercel projects**:

1. `artwork-viewer-backend` (root directory: `backend`)
2. `artwork-viewer-frontend` (root directory: `frontend`)

This keeps deployment simple and preserves current architecture.

## 1) Backend Project (`backend/`)

### What is configured
- FastAPI entrypoint for Vercel: `backend/app/app.py`
- Writable runtime static directory support (`/tmp/static`) via `backend/app/config.py`

### Vercel setup
1. Create a new Vercel project.
2. Select this repository.
3. Set **Root Directory** to `backend`.
4. Keep framework as `Other`.
5. Deploy (Vercel auto-detects FastAPI from `app/app.py`).

### Backend environment variables (Vercel Project Settings)
For current local-workbook mode:
- `LOCAL_XLSX_PATH=artwork.xlsx`
- `ALLOWED_ORIGINS=https://<your-frontend-domain>.vercel.app`

Optional:
- `STATIC_ROOT=/tmp/static` (auto-handled on Vercel if omitted)

If switching to Graph mode later, set Graph variables and clear `LOCAL_XLSX_PATH`.

Reference template:
- `backend/.env.vercel.example`

## 2) Frontend Project (`frontend/`)

### Vercel setup
1. Create a second Vercel project.
2. Select this repository.
3. Set **Root Directory** to `frontend`.
4. Framework preset should detect Vite.
5. Set env var:
   - `VITE_API_BASE_URL=https://<your-backend-domain>.vercel.app`
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

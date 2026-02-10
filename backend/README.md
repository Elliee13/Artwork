# Artwork Viewer Backend

## Run

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Workbook source configuration

Use one of these source definitions in `.env`:

1. Local mode (default):
   - `SOURCE_MODE=local`
   - `LOCAL_XLSX_PATH=artwork.xlsx`
2. Graph mode:
   - `SOURCE_MODE=graph`
   - Credentials: `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`
   - File locator (preferred): `MS_FILE_URL`
   - File locator (alternate): `MS_DRIVE_ID` + `MS_ITEM_ID`

In graph mode, the backend downloads the workbook and writes it to a temp file
before running the existing extraction pipeline.

In both modes, the API parses sheets as categories, extracts embedded images, and serves them via `/static`.

## Graph health check

- `GET /health/graph`
- `GET /api/health/graph`

Possible responses:
- `{"mode":"local","status":"disabled"}`
- `{"mode":"graph","status":"missing_config","missing":[...]}`
- `{"mode":"graph","status":"ok","bytes":12345}`
- `{"mode":"graph","status":"error","error":"..."}`

## Vercel

Backend Vercel deployment is configured with:
- `api/index.py` (Vercel serverless FastAPI entrypoint)

Use root directory `backend` in Vercel and set `LOCAL_XLSX_PATH=artwork.xlsx` for v1 local-workbook mode.

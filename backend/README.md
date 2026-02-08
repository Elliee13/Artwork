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

1. Temporary local mode: `LOCAL_XLSX_PATH`
2. Graph mode: `GRAPH_DRIVE_ID` + `GRAPH_ITEM_ID`
3. Graph mode: `GRAPH_SITE_ID` + `GRAPH_FILE_PATH`

If `LOCAL_XLSX_PATH` is set, backend reads that workbook directly.
If `LOCAL_XLSX_PATH` is empty, backend uses Microsoft Graph and downloads the latest workbook on each `GET /api/catalog` request.

In both modes, the API parses sheets as categories, extracts embedded images, and serves them via `/static`.

## Vercel

Backend Vercel deployment is configured with:
- `api/index.py` (Vercel serverless FastAPI entrypoint)

Use root directory `backend` in Vercel and set `LOCAL_XLSX_PATH=artwork.xlsx` for v1 local-workbook mode.

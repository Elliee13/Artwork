# Internal Artwork Viewer

Viewer-only web app for browsing artwork by Excel worksheet category.

## Project Structure

- `backend/` FastAPI + Microsoft Graph + openpyxl image extraction
- `frontend/` React + TypeScript + Tailwind + shadcn-style UI components

## Backend Run

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

For temporary local development without Graph, set `LOCAL_XLSX_PATH` in `backend/.env`.

## Frontend Run

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

## API

`GET /api/catalog`

```json
{
  "categories": [
    {
      "name": "KIDS",
      "images": [
        "/static/media/KIDS/img_1.png",
        "/static/media/KIDS/img_2.png"
      ]
    }
  ]
}
```

## Deployment

Vercel deployment instructions are in `DEPLOYMENT_VERCEL.md`.

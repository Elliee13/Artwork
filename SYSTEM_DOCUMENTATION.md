# Internal Artwork Viewer - System Documentation

## 1) Purpose
Internal, view-only web app for browsing artwork by category.

Core behavior:
- Each Excel worksheet tab is a category.
- Clicking a category shows all extracted artwork images for that sheet.

No editing/upload/delete/search/auth flows in scope.

## 2) Current Source Mode (Active Now)
The system is currently running in **local workbook mode**.

- Backend reads:
  - `LOCAL_XLSX_PATH` from `backend/.env`
- Current configured file:
  - `C:\Users\ellie\Downloads\Artwork\backend\artwork.xlsx`

If `LOCAL_XLSX_PATH` is set, Graph API is bypassed.

## 3) Future Source Mode (Graph API)
When ready, switch to Graph mode for dynamic OneDrive/SharePoint updates.

Required backend env values:
- `MS_TENANT_ID`
- `MS_CLIENT_ID`
- `MS_CLIENT_SECRET`
- One file locator mode:
1. `GRAPH_DRIVE_ID` + `GRAPH_ITEM_ID`
2. `GRAPH_SITE_ID` + `GRAPH_FILE_PATH`

Important:
- Use Graph IDs/path, not direct SharePoint URL parsing at runtime.
- The share link is the business source; Graph IDs/path are the technical locator.

## 4) Architecture
### Backend (`backend/`)
- Framework: FastAPI
- Key files:
  - `backend/app/main.py` - API + static mount
  - `backend/app/config.py` - env settings + validation
  - `backend/app/services/graph_client.py` - OAuth2 + workbook download from Graph
  - `backend/app/services/catalog_service.py` - workbook parsing + image extraction

Data flow:
1. Load workbook bytes (local path or Graph).
2. Iterate all worksheets.
3. Skip non-intentional default sheets using rule-based filtering (for example `Sheet1`, `Sheet2`).
4. Extract embedded images from each worksheet via `openpyxl`.
5. Run ZIP-level diagnostics (`xl/drawings`, `xl/media`) for unsupported object visibility.
6. Add extraction metadata per category (`images_count`, `unsupported_objects_detected`, `notes`).
7. Emit per-sheet backend logs for extraction/debug status.
8. Save images to:
   - `backend/static/media/<SHEET_NAME>/img_<index>.png`
9. Return catalog JSON with category names + static image URLs.

### Frontend (`frontend/`)
- Framework: React + TypeScript + Tailwind
- Key files:
  - `frontend/src/pages/GalleryPage.tsx`
  - `frontend/src/components/layout/AppLayout.tsx`
  - `frontend/src/components/catalog/CategoryTabs.tsx`
  - `frontend/src/components/catalog/ImageGrid.tsx`
  - `frontend/src/components/catalog/ImageItem.tsx`
  - `frontend/src/services/catalogApi.ts`

UI behavior:
- Fetch `/api/catalog`
- Set first category as default active tab
- Render one active category at a time
- Show responsive image-only grid
- Show loading and empty states

## 5) API Contract
### `GET /api/catalog`
Response:

```json
{
  "categories": [
    {
      "name": "KIDS",
      "images": [
        "/static/media/KIDS/img_1.png",
        "/static/media/KIDS/img_2.png"
      ],
      "images_count": 2,
      "unsupported_objects_detected": false,
      "notes": null
    }
  ]
}
```

Static files served at:
- `/static/...`

## 6) Runbook
### Backend
```powershell
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```powershell
cd frontend
npm run dev
```

Open:
- `http://localhost:5173`

## 7) Known Limitation: Excel `#UNKNOWN!`
If workbook content shows `#UNKNOWN!` or unsupported typed objects:
- Those are often not standard embedded pictures.
- They may not be extractable by `openpyxl`.

Expected behavior:
- Only real embedded worksheet images are extracted.
- Affected sheets may appear with zero images.
- API now adds notes/flags so zero-image categories are easier to interpret.

Recommended fix:
1. Replace unsupported objects with standard images.
2. Reinsert via Excel: **Insert -> Pictures**.
3. Save `.xlsx` and refresh.

## 8) Graph Cutover Checklist
1. Keep `LOCAL_XLSX_PATH` for now.
2. Obtain Graph app credentials and file identifiers.
3. In `backend/.env`:
   - Set Graph values.
   - Clear `LOCAL_XLSX_PATH`.
4. Restart backend.
5. Verify `GET /api/catalog` returns expected categories and image URLs.

## 9) Troubleshooting
- Backend startup validation error:
  - Ensure either local path is set OR complete Graph locator values are set.
- `No categories`:
  - Verify workbook path/file exists.
  - Verify sheets contain real embedded images.
- Frontend cannot load:
  - Check `frontend/.env` has `VITE_API_BASE_URL=http://localhost:8000`.

## 10) Vercel Deployment (v1)
- Deploy as two Vercel projects:
  - Backend root directory: `backend`
  - Frontend root directory: `frontend`
- Backend auto-detection entrypoint:
  - `backend/app/app.py`
- Recommended backend env for current source mode:
  - `LOCAL_XLSX_PATH=artwork.xlsx`
  - `ALLOWED_ORIGINS=https://<frontend-domain>.vercel.app`
- Frontend env:
  - `VITE_API_BASE_URL=https://<backend-domain>.vercel.app`
- On Vercel, runtime-generated static media is written to `/tmp/static`.

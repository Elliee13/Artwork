# Artwork Viewer Frontend

## Run

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

## Notes

- React + TypeScript + Tailwind CSS (v4) setup via Vite.
- shadcn-style primitives are under `src/components/ui` (`tabs`, `button`, `skeleton`).
- `GalleryPage` stays thin and delegates rendering to catalog components.

## Vercel

When deploying frontend on Vercel, set:
- `VITE_API_BASE_URL=https://<your-backend-domain>.vercel.app`

# frontend_v2

TypeScript rewrite of the Tooket-ther frontend, styled per `DESIGN.md` (Together AI: Coastal Edition).
The original `frontend/` directory is intentionally left untouched.

## Setup

```bash
cd frontend_v2
npm install
npm run dev          # http://localhost:5173 (proxies /api → http://localhost:8000)
npm run typecheck    # tsc --noEmit, strict mode
npm run build        # outputs dist/
```

The backend is unchanged. Start it separately from the repo root:

```bash
python app.py
```

The Vite dev server proxies `/api/*` to `http://localhost:8000`, so no CORS edits to `app.py` are required.

## Stack

- Vite 5 + TypeScript 5 (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
- Vanilla CSS with design tokens from `DESIGN.md`
- No runtime dependencies

## Layout

```
src/
  main.ts                 entry, mounts router
  router.ts               hash router
  styles/                 tokens.css, base.css, components.css
  api/                    typed fetch client + per-domain modules
  state/                  authStore, EventBus
  views/                  one per route
  components/             header, modal, seatGrid, paymentModal, refundModal, logPanel
  utils/                  dom helpers, formatting, validation
```

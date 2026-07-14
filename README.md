# osu!Peek

Preview an osu! beatmap's visual layout — hit circles, sliders, spinners — before downloading it, synced to a short audio preview.

## Project layout

- `frontend/` — Vite + TypeScript app (Canvas2D renderer, no framework)
- `backend/` — Express server that holds the osu! API credentials and proxies requests to osu!'s API/CDN

## Setup

1. Register an OAuth application at https://osu.ppy.sh/home/account/edit (OAuth section) to get a `client_id` and `client_secret`.
2. Copy `backend/.env.example` to `backend/.env` and fill in those two values.
3. Install dependencies in each half:
   ```
   cd backend && npm install
   cd ../frontend && npm install
   ```

## Running locally

In two separate terminals:

```
cd backend && npm run dev     # http://localhost:3001
cd frontend && npm run dev    # http://localhost:5173
```

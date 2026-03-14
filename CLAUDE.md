# CLAUDE.md — Bus Map

## Project overview

Live UIUC campus bus tracker. FastAPI backend proxies the MTD API and pushes vehicle positions to the browser via WebSocket. A Mapbox GL JS 3D map renders buses as fill-extrusion rectangular prisms colored by route.

## Running the app

```bash
# Backend (from backend/)
source .venv/Scripts/activate        # Windows
uvicorn app.main:app --reload        # http://localhost:8000

# Frontend (from frontend/)
npm run dev                          # http://localhost:5173
```

## Running tests

```bash
# Backend
cd backend && pytest -v

# Frontend
cd frontend && npm test
```

## Architecture decisions

### MTD API quirks
- Response structure has **no `rsp` wrapper** — data is at the top level alongside `status`.
- `getvehicles`: lat/lon are nested under `location`; route_id/trip_id/shape_id are nested under `trip`.
- `getstops`: each stop has a `stop_points` array containing the actual lat/lon entries — the parent stop object has no coordinates.
- `getshape` takes a `shape_id` parameter (not `route_id`). Shape IDs come from vehicle trip data; `MTDClient` builds a `route_id → shape_id` map as vehicles are polled.

### Frontend map
- **`optimizeDeps.exclude: ['mapbox-gl']` is intentionally absent.** mapbox-gl's dist is a UMD bundle; excluding it from Vite pre-bundling causes the browser to receive a raw UMD module it can't load as ESM. Let Vite pre-bundle it.
- **Bus rendering** uses `fill-extrusion` polygons (not symbol layers). Each bus is a 60 m × 20 m × 16 m rectangle computed from lat/lon/heading and extruded — intentionally oversized for visibility at zoom 15+. No external image files needed.
- **`<BusPopup>`** must be rendered inside the `<Map>` component tree (it is in `BusMap.tsx`). Rendering it outside causes a missing Map context error.

### Backend settings
- `ALLOWED_ORIGINS` in `.env` accepts either a JSON array (`["https://example.com"]`) or a comma-separated string (`https://example.com,https://other.com`). Both formats are handled — pydantic-settings JSON-decodes the list field first, and a fallback validator splits on commas. Defaults to `["http://localhost:5173"]` when unset.

## Key files

| File | Purpose |
|---|---|
| `backend/app/mtd_client.py` | MTD API client: rate-limit cache, vehicle/stop/shape fetching, field flattening |
| `backend/app/services/vehicle_tracker.py` | Background asyncio task, WS broadcast, per-connect cache send |
| `frontend/src/components/Map/BusLayer.tsx` | Computes rotated bus polygons, fill-extrusion layer |
| `frontend/src/hooks/useWebSocket.ts` | Auto-reconnect WS hook (3 s backoff) |
| `frontend/src/hooks/useRoutes.ts` | Lazy-loads route shapes when a route is toggled on |

## Environment variables

| Variable | File | Description |
|---|---|---|
| `MTD_API_KEY` | `backend/.env` | MTD developer API key |
| `ALLOWED_ORIGINS` | `backend/.env` | JSON array of allowed CORS origins |
| `VITE_MAPBOX_TOKEN` | `frontend/.env` | Mapbox public access token (`pk.…`) |

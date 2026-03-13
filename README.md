# UIUC Bus Map

A live campus bus tracker for UIUC. Buses appear as 3D rectangular prisms on a Mapbox GL dark map, updated in real time via WebSocket. A sidebar lets you filter by route.

![screenshot placeholder](docs/screenshot.png)

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.11+, FastAPI, httpx, Pydantic v2 |
| Real-time | WebSocket (FastAPI) — pushes vehicle positions every 30 s |
| Frontend | React 18, TypeScript, Vite 5 |
| Map | Mapbox GL JS v3, react-map-gl v7 |

## Quick start

### Prerequisites

- Python 3.11+ with `uv` (or `pip`)
- Node 18+
- A free [MTD API key](https://developer.mtd.org/) — register, then go to **API Keys**
- A free [Mapbox access token](https://account.mapbox.com/) — **Tokens** tab

### 1 — Backend

```bash
cd backend

# Create and activate virtual environment
uv venv && source .venv/Scripts/activate   # Windows
# uv venv && source .venv/bin/activate    # macOS/Linux

# Install dependencies
uv pip install -r requirements.txt

# Configure secrets
cp .env.example .env
# Edit .env and set MTD_API_KEY

# Start the server
uvicorn app.main:app --reload
# Runs on http://localhost:8000
```

### 2 — Frontend

```bash
cd frontend

npm install

# Configure secrets
cp .env.example .env
# Edit .env and set VITE_MAPBOX_TOKEN

npm run dev
# Runs on http://localhost:5173
```

Open http://localhost:5173 — the map loads, buses appear within 30 s.

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/routes` | All MTD routes |
| GET | `/api/routes/{route_id}/shape` | Shape points for a route |
| GET | `/api/stops` | All stops (flattened stop_points) |
| WS | `/ws` | Live vehicle positions, pushed every 30 s |

Interactive docs: http://localhost:8000/docs

## Project structure

```
bus-map/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, lifespan
│   │   ├── config.py          # pydantic-settings (reads .env)
│   │   ├── models.py          # Pydantic models for MTD types
│   │   ├── mtd_client.py      # Async MTD API client + rate-limit cache
│   │   ├── routers/           # REST + WebSocket endpoints
│   │   └── services/
│   │       └── vehicle_tracker.py  # Background poll + WS broadcast
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/Map/    # BusMap, BusLayer (3D prisms), RouteLayer, StopLayer
│   │   ├── components/        # BusPopup, Sidebar
│   │   ├── hooks/             # useBuses (WS), useRoutes, useWebSocket
│   │   ├── services/api.ts    # Typed REST fetch wrappers
│   │   └── types/mtd.ts       # TypeScript interfaces
│   ├── vite.config.ts
│   └── package.json
└── e2e/                       # Playwright end-to-end tests
```

## Running tests

```bash
# Backend (from backend/)
pytest -v
pytest --cov=app   # with coverage

# Frontend (from frontend/)
npm test
npm run test:coverage

# E2E (from e2e/) — requires both servers running
npx playwright test
```

## MTD API notes

- Rate limit: 1 000 req/hour. The backend enforces a 60 s minimum between `/getvehicles` calls.
- Shapes are fetched by `shape_id` (pulled from live vehicle trip data), not by `route_id` directly.
- Stops are nested: each stop object has a `stop_points` array containing the actual lat/lon entries.

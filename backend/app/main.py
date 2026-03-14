from __future__ import annotations
from contextlib import asynccontextmanager
import logging

import httpx
from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .models import MTDAPIError
from .mtd_client import MTDClient
from .services.vehicle_tracker import VehicleTracker

logger = logging.getLogger(__name__)


def get_mtd_client(request: Request) -> MTDClient:
    return request.app.state.mtd_client


def get_vehicle_tracker(ws: WebSocket) -> VehicleTracker:
    return ws.app.state.tracker


@asynccontextmanager
async def lifespan(app: FastAPI):
    http_client = httpx.AsyncClient(timeout=30.0)
    mtd_client = MTDClient(http_client, settings.mtd_api_key)
    tracker = VehicleTracker(mtd_client)

    app.state.mtd_client = mtd_client
    app.state.tracker = tracker

    if not settings.mtd_api_key:
        logger.error("MTD_API_KEY is not set — vehicle tracker will not start")
    else:
        # Pre-fetch static data
        try:
            await mtd_client.get_routes()
            await mtd_client.get_stops()
            logger.info("Static MTD data loaded")
        except Exception as exc:
            logger.warning("Could not pre-fetch MTD data: %s", exc)
        await tracker.start()
    yield
    await tracker.stop()
    await http_client.aclose()


app = FastAPI(title="Bus Map API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(MTDAPIError)
async def mtd_error_handler(request: Request, exc: MTDAPIError):
    return JSONResponse(status_code=502, content={"detail": str(exc)})


# Import routers after app is defined to avoid circular imports
from .routers import routes as routes_router  # noqa: E402
from .routers import stops as stops_router  # noqa: E402
from .routers import websocket as ws_router  # noqa: E402

app.include_router(routes_router.router)
app.include_router(stops_router.router)
app.include_router(ws_router.router)

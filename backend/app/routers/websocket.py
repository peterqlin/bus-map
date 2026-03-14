from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..main import get_vehicle_tracker
from ..services.vehicle_tracker import VehicleTracker

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    tracker: VehicleTracker = get_vehicle_tracker(ws)
    await tracker.connect(ws)
    try:
        # Receive loop exists only to detect disconnects; client messages are not acted on
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        tracker.disconnect(ws)
    except Exception:
        tracker.disconnect(ws)

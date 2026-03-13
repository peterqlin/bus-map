import pytest
import json
from app.services.vehicle_tracker import VehicleTracker


def test_websocket_receives_vehicles(test_client):
    # Pre-load vehicles into tracker's cache
    payload = json.dumps({"type": "vehicles", "data": [
        {
            "vehicle_id": "V1",
            "lat": 40.1020,
            "lon": -88.2272,
            "route_id": "1",
            "trip_id": "T1",
            "next_stop_id": "S1",
            "last_updated": "2024-01-01T00:00:00",
            "heading": 90.0,
        }
    ]})
    test_client.app.state.tracker._last_payload = payload

    with test_client.websocket_connect("/ws") as ws:
        data = ws.receive_text()
        msg = json.loads(data)
        assert msg["type"] == "vehicles"
        assert isinstance(msg["data"], list)

import pytest
import httpx
from fastapi.testclient import TestClient

from app.mtd_client import MTDClient
from app.main import app

# Match the actual MTD API response structure (no rsp wrapper, nested vehicle/stop fields)
MOCK_VEHICLES = [
    {
        "vehicle_id": "V1",
        "trip": {
            "trip_id": "T1",
            "route_id": "1",
            "shape_id": "SHAPE1",
        },
        "location": {"lat": 40.1020, "lon": -88.2272},
        "next_stop_id": "S1",
        "last_updated": "2024-01-01T00:00:00",
    }
]

MOCK_ROUTES = [
    {
        "route_id": "1",
        "route_short_name": "1",
        "route_long_name": "Green",
        "route_color": "00FF00",
        "route_text_color": "000000",
    }
]

MOCK_STOPS = [
    {
        "stop_id": "MAIN",
        "stop_name": "Main St",
        "stop_points": [
            {
                "stop_id": "S1",
                "stop_name": "Main St Stop",
                "stop_lat": 40.1020,
                "stop_lon": -88.2272,
            }
        ],
    }
]

MOCK_SHAPE = [
    {"shape_pt_lat": 40.1020, "shape_pt_lon": -88.2272, "shape_pt_sequence": 1}
]


def make_mtd_response(method: str) -> dict:
    if method == "getvehicles":
        return {"vehicles": MOCK_VEHICLES, "status": {"code": 200, "msg": "ok"}}
    if method == "getroutes":
        return {"routes": MOCK_ROUTES, "status": {"code": 200, "msg": "ok"}}
    if method == "getstops":
        return {"stops": MOCK_STOPS, "status": {"code": 200, "msg": "ok"}}
    if method == "getshape":
        return {"shapes": MOCK_SHAPE, "status": {"code": 200, "msg": "ok"}}
    return {"status": {"code": 200, "msg": "ok"}}


class MockMTDTransport(httpx.AsyncBaseTransport):
    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        method = path.split("/")[-1]
        data = make_mtd_response(method)
        return httpx.Response(200, json=data)


@pytest.fixture
def mock_http_client():
    transport = MockMTDTransport()
    return httpx.AsyncClient(transport=transport)


@pytest.fixture
def mtd_client(mock_http_client):
    return MTDClient(mock_http_client, api_key="test_key")


@pytest.fixture
def test_client(mtd_client):
    # Set state BEFORE entering lifespan so our mock survives startup
    # Use app_state override: prevent lifespan from replacing our mock client
    from app.services.vehicle_tracker import VehicleTracker
    tracker = VehicleTracker(mtd_client)
    app.state.mtd_client = mtd_client
    app.state.tracker = tracker

    # Use raise_server_exceptions=False to avoid lifespan overwriting state;
    # We patch app.state after lifespan runs by using the TestClient's lifecycle
    with TestClient(app, raise_server_exceptions=True) as client:
        # Override state that lifespan may have replaced
        client.app.state.mtd_client = mtd_client
        client.app.state.tracker = tracker
        yield client

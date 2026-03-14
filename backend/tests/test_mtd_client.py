import pytest
import time
from unittest.mock import patch
from app.mtd_client import MTDClient, _compute_bearing
from app.models import MTDAPIError


@pytest.mark.asyncio
async def test_get_routes(mtd_client):
    routes = await mtd_client.get_routes()
    assert len(routes) == 1
    assert routes[0].route_id == "1"
    assert routes[0].route_short_name == "1"


@pytest.mark.asyncio
async def test_get_stops(mtd_client):
    stops = await mtd_client.get_stops()
    assert len(stops) == 1
    assert stops[0].stop_id == "S1"


@pytest.mark.asyncio
async def test_get_vehicles(mtd_client):
    vehicles = await mtd_client.get_vehicles()
    assert len(vehicles) == 1
    assert vehicles[0].vehicle_id == "V1"


@pytest.mark.asyncio
async def test_rate_limit_prevents_double_fetch(mtd_client):
    # First fetch
    v1 = await mtd_client.get_vehicles()
    fetch_time = mtd_client._vehicle_last_fetch

    # Second fetch should return cached (not update last_fetch)
    v2 = await mtd_client.get_vehicles()
    assert mtd_client._vehicle_last_fetch == fetch_time
    assert v1 == v2


@pytest.mark.asyncio
async def test_routes_cached(mtd_client):
    r1 = await mtd_client.get_routes()
    r2 = await mtd_client.get_routes()
    assert r1 is r2  # Same object returned from cache


@pytest.mark.asyncio
async def test_get_shape(mtd_client):
    shape = await mtd_client.get_shape("1")
    assert len(shape) == 1
    assert shape[0].shape_pt_sequence == 1


def test_compute_bearing_cardinal():
    # North: increasing lat, same lon
    assert abs(_compute_bearing(40.0, -88.0, 40.1, -88.0) - 0.0) < 0.1
    # East: increasing lon, same lat
    assert abs(_compute_bearing(40.0, -88.0, 40.0, -87.9) - 90.0) < 0.1
    # South: decreasing lat, same lon
    assert abs(_compute_bearing(40.0, -88.0, 39.9, -88.0) - 180.0) < 0.1
    # West: decreasing lon, same lat
    assert abs(_compute_bearing(40.0, -88.0, 40.0, -88.1) - 270.0) < 0.1


@pytest.mark.asyncio
async def test_heading_defaults_to_zero_on_first_poll(mtd_client):
    vehicles = await mtd_client.get_vehicles()
    # First sighting has no previous position, so heading should be 0
    assert vehicles[0].heading == 0.0


@pytest.mark.asyncio
async def test_heading_computed_from_position_delta(mtd_client):
    # Seed a previous position south of the mock vehicle's location
    vehicle_id = "V1"
    mock_lat, mock_lon = 40.1020, -88.2272
    # Place previous position 0.01° south so the bearing should be ~0° (North)
    mtd_client._vehicle_prev_positions[vehicle_id] = (mock_lat - 0.01, mock_lon, 0.0)
    mtd_client._vehicle_last_fetch = 0.0  # bypass rate-limit cache

    vehicles = await mtd_client.get_vehicles()
    heading = vehicles[0].heading
    # Should be close to 0° (North) since vehicle moved north
    assert abs(heading) < 1.0 or abs(heading - 360.0) < 1.0

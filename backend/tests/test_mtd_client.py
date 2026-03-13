import pytest
import time
from unittest.mock import patch
from app.mtd_client import MTDClient
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

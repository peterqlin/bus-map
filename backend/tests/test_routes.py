import pytest


def test_get_routes(test_client):
    resp = test_client.get("/api/routes")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert data[0]["route_id"] == "1"


def test_get_route_shape(test_client):
    resp = test_client.get("/api/routes/1/shape")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)

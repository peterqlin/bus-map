import pytest


def test_get_stops(test_client):
    resp = test_client.get("/api/stops")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert data[0]["stop_id"] == "S1"

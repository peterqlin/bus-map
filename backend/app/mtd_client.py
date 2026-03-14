from __future__ import annotations
import asyncio
import math
import time
import logging
from typing import Any

import httpx

from .models import MTDAPIError, VehicleLocation, Route, Stop, ShapePoint

logger = logging.getLogger(__name__)

def _compute_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compass bearing in degrees [0, 360) clockwise from North."""
    φ1 = math.radians(lat1)
    φ2 = math.radians(lat2)
    Δλ = math.radians(lon2 - lon1)
    y = math.sin(Δλ) * math.cos(φ2)
    x = math.cos(φ1) * math.sin(φ2) - math.sin(φ1) * math.cos(φ2) * math.cos(Δλ)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def _point_to_segment_dist_sq(
    lat: float, lon: float,
    a_lat: float, a_lon: float,
    b_lat: float, b_lon: float,
) -> float:
    """Squared Euclidean distance (degrees²) from a point to a line segment."""
    dx, dy = b_lon - a_lon, b_lat - a_lat
    if dx == 0.0 and dy == 0.0:
        return (lat - a_lat) ** 2 + (lon - a_lon) ** 2
    t = max(0.0, min(1.0, ((lon - a_lon) * dx + (lat - a_lat) * dy) / (dx * dx + dy * dy)))
    return (lat - (a_lat + t * dy)) ** 2 + (lon - (a_lon + t * dx)) ** 2


def _snap_heading_to_route(
    shape: list[ShapePoint],
    lat: float,
    lon: float,
    heading: float,
) -> float:
    """
    Correct `heading` by snapping it to the nearest route segment bearing.

    Finds the shape segment closest to (lat, lon), then chooses the forward
    or reverse direction of that segment based on which is angularly closer
    to the existing heading.  This eliminates the 180° ambiguity that arises
    when a bus makes a turn between two poll cycles.
    """
    if len(shape) < 2:
        return heading

    best_dist_sq = float("inf")
    best_seg_bearing = heading

    for i in range(len(shape) - 1):
        a, b = shape[i], shape[i + 1]
        d_sq = _point_to_segment_dist_sq(
            lat, lon,
            a.shape_pt_lat, a.shape_pt_lon,
            b.shape_pt_lat, b.shape_pt_lon,
        )
        if d_sq < best_dist_sq:
            best_dist_sq = d_sq
            best_seg_bearing = _compute_bearing(
                a.shape_pt_lat, a.shape_pt_lon,
                b.shape_pt_lat, b.shape_pt_lon,
            )

    reverse = (best_seg_bearing + 180.0) % 360.0
    fwd_diff = abs((best_seg_bearing - heading + 180.0) % 360.0 - 180.0)
    rev_diff = abs((reverse - heading + 180.0) % 360.0 - 180.0)
    return best_seg_bearing if fwd_diff <= rev_diff else reverse


MTD_BASE = "https://developer.mtd.org/api/v2.2/json"
VEHICLE_POLL_INTERVAL = 30  # seconds minimum between fetches
SHAPE_CACHE_TTL = 86_400    # 24 hours — aligns with nightly GTFS updates


class MTDClient:
    def __init__(self, client: httpx.AsyncClient, api_key: str):
        self._client = client
        self._api_key = api_key
        self._vehicle_cache: list[VehicleLocation] = []
        self._vehicle_last_fetch: float = 0.0
        # vehicle_id -> (lat, lon, heading) — used to compute heading from position delta
        self._vehicle_prev_positions: dict[str, tuple[float, float, float]] = {}
        self._routes_cache: list[Route] | None = None
        self._stops_cache: list[Stop] | None = None
        self._shape_cache: dict[str, list[ShapePoint]] = {}
        self._shape_cache_expiry: dict[str, float] = {}
        self._shape_fetching: dict[str, asyncio.Task[list[ShapePoint]]] = {}
        # Maps route_id -> shape_id, populated from vehicle trip data
        self._route_shape_ids: dict[str, str] = {}

    async def _get(self, method: str, **params: Any) -> dict[str, Any]:
        url = f"{MTD_BASE}/{method}"
        params["key"] = self._api_key
        resp = await self._client.get(url, params=params)
        resp.raise_for_status()
        body = resp.json()
        # MTD v2.2 returns data at top level (no rsp wrapper)
        stat = body.get("status", {})
        code = stat.get("code", 200)
        msg = stat.get("msg", "ok")
        if code != 200:
            raise MTDAPIError(code, msg)
        return body

    async def get_vehicles(self) -> list[VehicleLocation]:
        now = time.monotonic()
        if now - self._vehicle_last_fetch < VEHICLE_POLL_INTERVAL and self._vehicle_cache:
            logger.debug("Returning cached vehicles")
            return self._vehicle_cache

        body = await self._get("getvehicles")
        raw = body.get("vehicles", [])
        vehicles: list[VehicleLocation] = []
        for v in raw:
            trip = v.get("trip") or {}
            location = v.get("location") or {}
            route_id = trip.get("route_id") or ""
            shape_id = trip.get("shape_id") or ""
            if route_id and shape_id:
                self._route_shape_ids[route_id] = shape_id
            vehicle_id = v.get("vehicle_id") or ""
            lat_val = location.get("lat")
            lon_val = location.get("lon")
            if lat_val is None or lon_val is None:
                continue  # skip vehicles with no position data

            # MTD API v2.2 does not return a heading field in the location object.
            # Compute compass bearing from the previous known position instead.
            # Fall back to the last known heading if the vehicle hasn't moved enough
            # to produce a reliable bearing (threshold ≈ 11 m).
            api_heading = location.get("heading")
            if api_heading is not None:
                heading = float(api_heading)
            else:
                prev = self._vehicle_prev_positions.get(vehicle_id)
                if prev is not None:
                    prev_lat, prev_lon, prev_heading = prev
                    if (lat_val - prev_lat) ** 2 + (lon_val - prev_lon) ** 2 > 1e-8:
                        heading = _compute_bearing(prev_lat, prev_lon, lat_val, lon_val)
                    else:
                        heading = prev_heading  # stationary — keep last known heading
                else:
                    heading = 0.0  # first sighting, no direction available yet
            # Snap to nearest route segment if the shape is already in cache.
            # Pure synchronous read — no HTTP call, zero extra latency.
            if route_id and route_id in self._shape_cache:
                heading = _snap_heading_to_route(
                    self._shape_cache[route_id], lat_val, lon_val, heading
                )

            self._vehicle_prev_positions[vehicle_id] = (lat_val, lon_val, heading)

            vehicles.append(VehicleLocation(
                vehicle_id=vehicle_id,
                lat=lat_val,
                lon=lon_val,
                route_id=route_id,
                trip_id=trip.get("trip_id") or "",
                shape_id=shape_id,
                next_stop_id=v.get("next_stop_id") or "",
                last_updated=v.get("last_updated") or "",
                heading=heading,
            ))
        self._vehicle_cache = vehicles
        self._vehicle_last_fetch = now
        return self._vehicle_cache

    async def get_routes(self) -> list[Route]:
        if self._routes_cache is not None:
            return self._routes_cache
        body = await self._get("getroutes")
        raw = body.get("routes", [])
        self._routes_cache = [Route.model_validate(r) for r in raw]
        return self._routes_cache

    async def get_stops(self) -> list[Stop]:
        if self._stops_cache is not None:
            return self._stops_cache
        body = await self._get("getstops")
        raw = body.get("stops", [])
        # Each stop has a stop_points array with the actual lat/lon
        stops: list[Stop] = []
        for stop in raw:
            for sp in stop.get("stop_points", []):
                stops.append(Stop(
                    stop_id=sp.get("stop_id", ""),
                    stop_name=sp.get("stop_name", stop.get("stop_name", "")),
                    stop_lat=sp.get("stop_lat", 0.0),
                    stop_lon=sp.get("stop_lon", 0.0),
                ))
        self._stops_cache = stops
        return self._stops_cache

    async def get_shape(self, route_id: str) -> list[ShapePoint]:
        now = time.monotonic()
        if route_id in self._shape_cache and now < self._shape_cache_expiry.get(route_id, 0):
            return self._shape_cache[route_id]
        # If a fetch is already in flight for this route, await it instead of launching another
        if route_id in self._shape_fetching:
            return await self._shape_fetching[route_id]
        task: asyncio.Task[list[ShapePoint]] = asyncio.create_task(self._fetch_shape(route_id))
        self._shape_fetching[route_id] = task
        try:
            return await task
        finally:
            self._shape_fetching.pop(route_id, None)

    async def _fetch_shape(self, route_id: str) -> list[ShapePoint]:
        # Look up shape_id from vehicle trip data, fallback to route_id
        shape_id = self._route_shape_ids.get(route_id, route_id)
        body = await self._get("getshape", shape_id=shape_id)
        raw = body.get("shapes", [])
        points = [ShapePoint(
            shape_pt_lat=p["shape_pt_lat"],
            shape_pt_lon=p["shape_pt_lon"],
            shape_pt_sequence=p["shape_pt_sequence"],
        ) for p in raw]
        self._shape_cache[route_id] = points
        self._shape_cache_expiry[route_id] = time.monotonic() + SHAPE_CACHE_TTL
        return points

from __future__ import annotations
from pydantic import BaseModel
from typing import Any


class MTDAPIError(Exception):
    def __init__(self, code: int, msg: str):
        self.code = code
        self.msg = msg
        super().__init__(f"MTD API error {code}: {msg}")


class VehicleLocation(BaseModel):
    vehicle_id: str
    lat: float
    lon: float
    route_id: str
    trip_id: str
    shape_id: str
    next_stop_id: str
    last_updated: str
    heading: float = 0.0


class Route(BaseModel):
    route_id: str
    route_short_name: str
    route_long_name: str
    route_color: str
    route_text_color: str


class Stop(BaseModel):
    stop_id: str
    stop_name: str
    stop_lat: float
    stop_lon: float


class ShapePoint(BaseModel):
    shape_pt_lat: float
    shape_pt_lon: float
    shape_pt_sequence: int

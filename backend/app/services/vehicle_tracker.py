from __future__ import annotations
import asyncio
import json
import logging
from typing import TYPE_CHECKING

from fastapi import WebSocket, WebSocketDisconnect

if TYPE_CHECKING:
    from ..mtd_client import MTDClient

logger = logging.getLogger(__name__)

POLL_INTERVAL = 30  # seconds


class VehicleTracker:
    def __init__(self, mtd_client: "MTDClient"):
        self._client = mtd_client
        self._clients: set[WebSocket] = set()
        self._task: asyncio.Task | None = None
        self._last_payload: str = json.dumps({"type": "vehicles", "data": []})

    async def start(self) -> None:
        self._task = asyncio.create_task(self._poll_loop())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._clients.add(ws)
        # Send cached data immediately
        try:
            await ws.send_text(self._last_payload)
        except Exception:
            self._clients.discard(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self._clients.discard(ws)

    async def _broadcast(self, payload: str) -> None:
        dead: set[WebSocket] = set()
        for ws in list(self._clients):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        self._clients -= dead

    async def _poll_loop(self) -> None:
        while True:
            try:
                vehicles = await self._client.get_vehicles()
                data = [v.model_dump() for v in vehicles]
                payload = json.dumps({"type": "vehicles", "data": data})
                self._last_payload = payload
                await self._broadcast(payload)
            except Exception as exc:
                logger.warning("Vehicle poll error: %s", exc)
            await asyncio.sleep(POLL_INTERVAL)

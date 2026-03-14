from fastapi import APIRouter, Depends, HTTPException
from ..models import Route, ShapePoint, MTDAPIError
from ..mtd_client import MTDClient
from ..main import get_mtd_client

router = APIRouter(prefix="/api")


@router.get("/routes", response_model=list[Route])
async def get_routes(client: MTDClient = Depends(get_mtd_client)):
    try:
        return await client.get_routes()
    except MTDAPIError as exc:
        raise HTTPException(502, detail=str(exc))


@router.get("/routes/{route_id}/shape", response_model=list[ShapePoint])
async def get_route_shape(route_id: str, client: MTDClient = Depends(get_mtd_client)):
    try:
        routes = await client.get_routes()
        valid_ids = {r.route_id for r in routes}
        if route_id not in valid_ids:
            raise HTTPException(404, detail=f"Route '{route_id}' not found")
        return await client.get_shape(route_id)
    except MTDAPIError as exc:
        raise HTTPException(502, detail=str(exc))

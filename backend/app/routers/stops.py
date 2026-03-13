from fastapi import APIRouter, Depends, HTTPException
from ..models import Stop, MTDAPIError
from ..mtd_client import MTDClient
from ..main import get_mtd_client

router = APIRouter(prefix="/api")


@router.get("/stops", response_model=list[Stop])
async def get_stops(client: MTDClient = Depends(get_mtd_client)):
    try:
        return await client.get_stops()
    except MTDAPIError as exc:
        raise HTTPException(502, detail=str(exc))

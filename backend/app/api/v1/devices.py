from fastapi import Depends, Query
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import AuthContext, require_permission
from app.schemas import (
    DeviceCreate,
    DeviceResponse,
    DeviceUpdate,
    PaginatedResponse,
)
from app.services import DeviceService

router = APIRouter()


@router.get("/devices", response_model=PaginatedResponse[DeviceResponse])
async def list_devices(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    team_id: str | None = Query(default=None),
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[DeviceResponse]:
    service = DeviceService(db)
    items, total = await service.list_devices(ctx, page, page_size, search, status, team_id)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/devices", response_model=DeviceResponse, status_code=201)
async def create_device(
    data: DeviceCreate,
    ctx: AuthContext = Depends(require_permission("devices:create")),
    db: AsyncSession = Depends(get_db),
) -> DeviceResponse:
    service = DeviceService(db)
    return await service.create_device(ctx, data)


@router.get("/devices/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: str,
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> DeviceResponse:
    service = DeviceService(db)
    return await service.get_device(ctx, device_id)


@router.patch("/devices/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: str,
    data: DeviceUpdate,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> DeviceResponse:
    service = DeviceService(db)
    return await service.update_device(ctx, device_id, data)


@router.delete("/devices/{device_id}", status_code=204)
async def delete_device(
    device_id: str,
    ctx: AuthContext = Depends(require_permission("devices:delete")),
    db: AsyncSession = Depends(get_db),
) -> None:
    service = DeviceService(db)
    await service.delete_device(ctx, device_id)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import AuthContext, require_permission
from app.schemas import (
    CircleGeofenceCreate,
    GeofenceEventResponse,
    GeofenceResponse,
    GeofenceUpdate,
    PolygonGeofenceCreate,
)
from app.services import GeofenceService

router = APIRouter()


@router.post("/geofences/circle", response_model=GeofenceResponse, status_code=201)
async def create_circle_geofence(
    data: CircleGeofenceCreate,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> GeofenceResponse:
    service = GeofenceService(db)
    return await service.create_circle(ctx.organization_id, data)


@router.post("/geofences/polygon", response_model=GeofenceResponse, status_code=201)
async def create_polygon_geofence(
    data: PolygonGeofenceCreate,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> GeofenceResponse:
    service = GeofenceService(db)
    return await service.create_polygon(ctx.organization_id, data)


@router.get("/geofences", response_model=list[GeofenceResponse])
async def list_geofences(
    include_archived: bool = False,
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> list[GeofenceResponse]:
    service = GeofenceService(db)
    return await service.list_geofences(ctx.organization_id, include_archived)


@router.get("/geofences/{geofence_id}", response_model=GeofenceResponse)
async def get_geofence(
    geofence_id: str,
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> GeofenceResponse:
    service = GeofenceService(db)
    try:
        return await service.get_geofence(ctx.organization_id, geofence_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/geofences/{geofence_id}", response_model=GeofenceResponse)
async def update_geofence(
    geofence_id: str,
    data: GeofenceUpdate,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> GeofenceResponse:
    service = GeofenceService(db)
    try:
        return await service.update_geofence(ctx.organization_id, geofence_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/geofences/{geofence_id}", status_code=204)
async def delete_geofence(
    geofence_id: str,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> None:
    service = GeofenceService(db)
    try:
        await service.delete_geofence(ctx.organization_id, geofence_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/geofences/{geofence_id}/archive", response_model=GeofenceResponse)
async def archive_geofence(
    geofence_id: str,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> GeofenceResponse:
    service = GeofenceService(db)
    try:
        return await service.archive_geofence(ctx.organization_id, geofence_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/geofences/{geofence_id}/enable", response_model=GeofenceResponse)
async def enable_geofence(
    geofence_id: str,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> GeofenceResponse:
    service = GeofenceService(db)
    try:
        return await service.toggle_enable(ctx.organization_id, geofence_id, True)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/geofences/{geofence_id}/disable", response_model=GeofenceResponse)
async def disable_geofence(
    geofence_id: str,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> GeofenceResponse:
    service = GeofenceService(db)
    try:
        return await service.toggle_enable(ctx.organization_id, geofence_id, False)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/geofences/events", response_model=list[GeofenceEventResponse])
async def list_geofence_events(
    geofence_id: str | None = None,
    device_id: str | None = None,
    event_type: str | None = None,
    limit: int = 100,
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> list[GeofenceEventResponse]:
    service = GeofenceService(db)
    events = await service.list_events(
        ctx.organization_id, geofence_id, device_id, event_type, limit
    )
    return [GeofenceEventResponse.model_validate(e) for e in events]

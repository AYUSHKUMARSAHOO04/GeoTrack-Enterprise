from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.device_auth import authenticate_device
from app.core.rbac import AuthContext, require_permission
from app.models import Device
from app.schemas import (
    BatchLocationIngest,
    BoundingBoxParams,
    DeviceStatusResponse,
    LocationIngest,
    LocationResponse,
    SpatialQueryParams,
    TripResponse,
)
from app.services import LocationService

router = APIRouter()


async def get_device_for_ingestion(
    x_api_key: Annotated[str | None, Header()] = None,
    x_device_secret: Annotated[str | None, Header()] = None,
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> Device:
    if x_api_key and x_device_secret:
        return await authenticate_device(x_api_key, x_device_secret, db)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Device authentication required (X-API-Key + X-Device-Secret headers)",
    )


@router.post("/location", response_model=LocationResponse, status_code=201)
async def ingest_location(
    data: LocationIngest,
    device: Device = Depends(get_device_for_ingestion),
    db: AsyncSession = Depends(get_db),
) -> LocationResponse:
    service = LocationService(db)
    result = await service.ingest_single(device, data)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate location (same device_id and captured_at)",
        )
    return result


@router.post("/location/batch", response_model=list[LocationResponse], status_code=201)
async def ingest_location_batch(
    data: BatchLocationIngest,
    device: Device = Depends(get_device_for_ingestion),
    db: AsyncSession = Depends(get_db),
) -> list[LocationResponse]:
    service = LocationService(db)
    return await service.ingest_batch(device, data.locations)


@router.get("/devices/{device_id}/locations", response_model=list[LocationResponse])
async def get_device_locations(
    device_id: str,
    start_time: datetime | None = Query(default=None),
    end_time: datetime | None = Query(default=None),
    limit: int = Query(default=1000, ge=1, le=5000),
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> list[LocationResponse]:
    service = LocationService(db)
    try:
        return await service.get_device_history(
            ctx.organization_id, device_id, start_time, end_time, limit
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/device-statuses", response_model=list[DeviceStatusResponse])
async def get_device_statuses(
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> list[DeviceStatusResponse]:
    service = LocationService(db)
    statuses = await service.get_device_statuses(ctx.organization_id)
    return [DeviceStatusResponse.model_validate(s) for s in statuses]


@router.get("/trips", response_model=list[TripResponse])
async def get_trips(
    device_id: str | None = Query(default=None),
    start_time: datetime | None = Query(default=None),
    end_time: datetime | None = Query(default=None),
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> list[TripResponse]:
    service = LocationService(db)
    trips = await service.get_trips(ctx.organization_id, device_id, start_time, end_time)
    return [TripResponse.model_validate(t) for t in trips]


@router.get("/trips/{trip_id}/history", response_model=list[LocationResponse])
async def get_trip_history(
    trip_id: str,
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> list[LocationResponse]:
    service = LocationService(db)
    try:
        return await service.get_trip_history(ctx.organization_id, trip_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/locations/within-radius", response_model=list[LocationResponse])
async def find_within_radius(
    params: SpatialQueryParams = Depends(),
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> list[LocationResponse]:
    service = LocationService(db)
    return await service.find_within_radius(
        ctx.organization_id, params.latitude, params.longitude, params.radius_meters
    )


@router.get("/locations/in-bbox", response_model=list[LocationResponse])
async def find_in_bbox(
    params: BoundingBoxParams = Depends(),
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> list[LocationResponse]:
    service = LocationService(db)
    return await service.find_in_bbox(
        ctx.organization_id,
        params.min_lat,
        params.max_lat,
        params.min_lng,
        params.max_lng,
    )


@router.get("/locations/nearest", response_model=list[tuple[LocationResponse, float]])
async def find_nearest(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    limit: int = Query(default=10, ge=1, le=100),
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> list[tuple[LocationResponse, float]]:
    service = LocationService(db)
    return await service.find_nearest(ctx.organization_id, latitude, longitude, limit)

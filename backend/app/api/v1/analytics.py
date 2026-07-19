from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import AuthContext, require_permission
from app.schemas import FleetAnalytics
from app.services import AnalyticsService

router = APIRouter()


@router.get("/analytics/fleet", response_model=FleetAnalytics)
async def get_fleet_analytics(
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> FleetAnalytics:
    service = AnalyticsService(db)
    return await service.get_fleet_analytics(ctx.organization_id)


@router.get("/analytics/trends")
async def get_trends(
    days: int = 30,
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    service = AnalyticsService(db)
    return await service.get_trend(ctx.organization_id, days)


@router.get("/analytics/top-devices")
async def get_top_devices(
    limit: int = 10,
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    service = AnalyticsService(db)
    return await service.get_top_devices(ctx.organization_id, limit)


@router.get("/analytics/recent-alerts")
async def get_recent_alerts(
    limit: int = 10,
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    service = AnalyticsService(db)
    alerts = await service.get_recent_alerts(ctx.organization_id, limit)
    return [
        {
            "id": a.id,
            "title": a.title,
            "severity": a.severity,
            "state": a.state,
            "alert_type": a.alert_type,
            "device_id": a.device_id,
            "triggered_at": a.triggered_at.isoformat(),
        }
        for a in alerts
    ]


@router.get("/analytics/recent-trips")
async def get_recent_trips(
    limit: int = 10,
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    service = AnalyticsService(db)
    trips = await service.get_recent_trips(ctx.organization_id, limit)
    return [
        {
            "id": t.id,
            "device_id": t.device_id,
            "start_time": t.start_time.isoformat(),
            "end_time": t.end_time.isoformat() if t.end_time else None,
            "distance_meters": t.distance_meters,
            "status": t.status,
        }
        for t in trips
    ]

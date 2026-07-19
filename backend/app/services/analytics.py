from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Alert,
    AnalyticsSnapshot,
    DeviceStatus,
    Trip,
)
from app.repositories import (
    AlertRepository,
    DeviceRepository,
    DeviceStatusRepository,
    GeofenceRepository,
    TripRepository,
)
from app.schemas import FleetAnalytics


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.device_repo = DeviceRepository(db)
        self.status_repo = DeviceStatusRepository(db)
        self.trip_repo = TripRepository(db)
        self.alert_repo = AlertRepository(db)
        self.geofence_repo = GeofenceRepository(db)

    async def get_fleet_analytics(self, org_id: str) -> FleetAnalytics:
        devices, _ = await self.device_repo.list(org_id, page=1, page_size=10000)
        statuses = await self.status_repo.list_by_org(org_id)

        active = sum(1 for d in devices if not d.is_deleted)
        moving = sum(1 for s in statuses if s.status == "moving")
        idle = sum(1 for s in statuses if s.status == "idle")
        offline = sum(1 for s in statuses if s.status in ("offline", "stopped"))

        today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        trips_today = await self._count_trips_today(org_id, today_start)
        distance_today = await self._sum_distance_today(org_id, today_start)
        alerts_today = await self.alert_repo.count_today(org_id)
        alerts_open = await self.alert_repo.count_by_state(org_id, "open")
        geofences = await self.geofence_repo.list_by_org(org_id, enabled_only=True)

        avg_speed = self._compute_avg_speed(statuses)
        utilization = self._compute_utilization(active, moving + idle)

        return FleetAnalytics(
            active_devices=active,
            moving_devices=moving,
            idle_devices=idle,
            offline_devices=offline,
            total_devices=len(devices),
            fleet_utilization_pct=round(utilization, 1),
            avg_speed_kmh=round(avg_speed, 1),
            trips_today=trips_today,
            distance_today_meters=round(distance_today, 1),
            alerts_today=alerts_today,
            alerts_open=alerts_open,
            geofences_active=len(geofences),
        )

    async def get_trend(self, org_id: str, days: int = 30) -> list[dict[str, Any]]:
        start_date = datetime.now(UTC).date() - timedelta(days=days)
        result = await self.db.execute(
            select(AnalyticsSnapshot)
            .where(
                AnalyticsSnapshot.organization_id == org_id,
                AnalyticsSnapshot.snapshot_date >= start_date,
            )
            .order_by(AnalyticsSnapshot.snapshot_date.asc())
        )
        snapshots = result.scalars().all()
        return [
            {
                "date": s.snapshot_date.isoformat(),
                "active_devices": s.active_devices,
                "moving_devices": s.moving_devices,
                "trips_count": s.trips_count,
                "alerts_count": s.alerts_count,
                "total_distance_meters": s.total_distance_meters,
                "fleet_utilization_pct": s.fleet_utilization_pct,
            }
            for s in snapshots
        ]

    async def get_top_devices(self, org_id: str, limit: int = 10) -> list[dict[str, Any]]:
        today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        result = await self.db.execute(
            select(
                Trip.device_id,
                func.count(Trip.id).label("trip_count"),
                func.sum(Trip.distance_meters).label("total_distance"),
                func.max(Trip.max_speed_kmh).label("max_speed"),
            )
            .where(
                Trip.organization_id == org_id,
                Trip.start_time >= today_start,
            )
            .group_by(Trip.device_id)
            .order_by(func.sum(Trip.distance_meters).desc())
            .limit(limit)
        )
        rows = result.all()
        device_ids = [r[0] for r in rows]
        devices = {}
        for did in device_ids:
            d = await self.device_repo.get_by_id(did, org_id)
            if d:
                devices[did] = d.name
        return [
            {
                "device_id": r[0],
                "device_name": devices.get(r[0], r[0]),
                "trip_count": r[1],
                "total_distance_meters": float(r[2] or 0),
                "max_speed_kmh": float(r[3] or 0),
            }
            for r in rows
        ]

    async def get_recent_alerts(self, org_id: str, limit: int = 10) -> list[Alert]:
        return await self.alert_repo.list_by_org(org_id, limit=limit)

    async def get_recent_trips(self, org_id: str, limit: int = 10) -> list[Trip]:
        return await self.trip_repo.list_by_org(org_id, limit=limit)

    async def _count_trips_today(self, org_id: str, today_start: datetime) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(Trip)
            .where(Trip.organization_id == org_id, Trip.start_time >= today_start)
        )
        return int(result.scalar() or 0)

    async def _sum_distance_today(self, org_id: str, today_start: datetime) -> float:
        result = await self.db.execute(
            select(func.sum(Trip.distance_meters)).where(
                Trip.organization_id == org_id, Trip.start_time >= today_start
            )
        )
        return float(result.scalar() or 0)

    def _compute_avg_speed(self, statuses: list[DeviceStatus]) -> float:
        speeds = [s.last_speed for s in statuses if s.last_speed and s.last_speed > 0]
        if not speeds:
            return 0
        return sum(speeds) / len(speeds)

    def _compute_utilization(self, total: int, active: int) -> float:
        if total == 0:
            return 0
        return (active / total) * 100

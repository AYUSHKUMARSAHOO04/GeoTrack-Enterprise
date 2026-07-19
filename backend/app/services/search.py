from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Alert, Device, Geofence, Team, Trip


class SearchService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(self, org_id: str, query: str, limit: int = 20) -> dict[str, Any]:
        q = f"%{query.lower()}%"
        devices = await self._search_devices(org_id, q, limit)
        teams = await self._search_teams(org_id, q, limit)
        trips = await self._search_trips(org_id, q, limit)
        geofences = await self._search_geofences(org_id, q, limit)
        alerts = await self._search_alerts(org_id, q, limit)

        total = len(devices) + len(teams) + len(trips) + len(geofences) + len(alerts)
        return {
            "devices": devices,
            "teams": teams,
            "trips": trips,
            "geofences": geofences,
            "alerts": alerts,
            "total": total,
        }

    async def _search_devices(self, org_id: str, q: str, limit: int) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(Device)
            .where(
                Device.organization_id == org_id,
                Device.is_deleted.is_(False),
                or_(
                    Device.name.ilike(q),
                    Device.external_identifier.ilike(q),
                ),
            )
            .limit(limit)
        )
        return [
            {
                "id": d.id,
                "name": d.name,
                "type": d.device_type,
                "status": d.status,
                "external_identifier": d.external_identifier,
            }
            for d in result.scalars().all()
        ]

    async def _search_teams(self, org_id: str, q: str, limit: int) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(Team)
            .where(
                Team.organization_id == org_id,
                or_(Team.name.ilike(q), Team.description.ilike(q)),
            )
            .limit(limit)
        )
        return [
            {"id": t.id, "name": t.name, "description": t.description}
            for t in result.scalars().all()
        ]

    async def _search_trips(self, org_id: str, q: str, limit: int) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(Trip, Device)
            .join(Device, Trip.device_id == Device.id)
            .where(
                Trip.organization_id == org_id,
                or_(
                    Device.name.ilike(q),
                    Device.external_identifier.ilike(q),
                ),
            )
            .order_by(Trip.start_time.desc())
            .limit(limit)
        )
        return [
            {
                "id": trip.id,
                "device_id": trip.device_id,
                "device_name": device.name,
                "start_time": trip.start_time.isoformat(),
                "end_time": trip.end_time.isoformat() if trip.end_time else None,
                "distance_meters": trip.distance_meters,
                "status": trip.status,
            }
            for trip, device in result.all()
        ]

    async def _search_geofences(self, org_id: str, q: str, limit: int) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(Geofence)
            .where(
                Geofence.organization_id == org_id,
                Geofence.is_archived.is_(False),
                or_(
                    Geofence.name.ilike(q),
                    Geofence.description.ilike(q),
                ),
            )
            .limit(limit)
        )
        return [
            {
                "id": g.id,
                "name": g.name,
                "type": g.geofence_type,
                "is_enabled": g.is_enabled,
            }
            for g in result.scalars().all()
        ]

    async def _search_alerts(self, org_id: str, q: str, limit: int) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(Alert)
            .where(
                Alert.organization_id == org_id,
                or_(Alert.title.ilike(q), Alert.message.ilike(q)),
            )
            .order_by(Alert.triggered_at.desc())
            .limit(limit)
        )
        return [
            {
                "id": a.id,
                "title": a.title,
                "severity": a.severity,
                "state": a.state,
                "alert_type": a.alert_type,
                "triggered_at": a.triggered_at.isoformat(),
            }
            for a in result.scalars().all()
        ]

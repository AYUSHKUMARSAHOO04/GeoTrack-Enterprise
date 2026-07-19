from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import GeofenceEvent


class GeofenceEventRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, **kwargs: Any) -> GeofenceEvent:
        event = GeofenceEvent(**kwargs)
        self.db.add(event)
        await self.db.flush()
        return event

    async def list_by_org(
        self,
        org_id: str,
        geofence_id: str | None = None,
        device_id: str | None = None,
        event_type: str | None = None,
        limit: int = 100,
    ) -> list[GeofenceEvent]:
        conditions: list[Any] = [GeofenceEvent.organization_id == org_id]
        if geofence_id:
            conditions.append(GeofenceEvent.geofence_id == geofence_id)
        if device_id:
            conditions.append(GeofenceEvent.device_id == device_id)
        if event_type:
            conditions.append(GeofenceEvent.event_type == event_type)
        result = await self.db.execute(
            select(GeofenceEvent)
            .where(*conditions)
            .order_by(GeofenceEvent.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_latest_for_device_geofence(
        self, device_id: str, geofence_id: str
    ) -> GeofenceEvent | None:
        result = await self.db.execute(
            select(GeofenceEvent)
            .where(
                GeofenceEvent.device_id == device_id,
                GeofenceEvent.geofence_id == geofence_id,
            )
            .order_by(GeofenceEvent.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

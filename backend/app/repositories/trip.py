from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Trip


class TripRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, trip_id: str, org_id: str) -> Trip | None:
        result = await self.db.execute(
            select(Trip).where(Trip.id == trip_id, Trip.organization_id == org_id)
        )
        return result.scalar_one_or_none()

    async def get_active_trip(self, device_id: str) -> Trip | None:
        result = await self.db.execute(
            select(Trip).where(Trip.device_id == device_id, Trip.status == "active")
        )
        return result.scalar_one_or_none()

    async def create(self, **kwargs: Any) -> Trip:
        trip = Trip(**kwargs)
        self.db.add(trip)
        await self.db.flush()
        return trip

    async def update(self, trip: Trip, **kwargs: Any) -> Trip:
        for key, value in kwargs.items():
            setattr(trip, key, value)
        await self.db.flush()
        return trip

    async def list_by_device(
        self,
        device_id: str,
        org_id: str,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 50,
    ) -> list[Trip]:
        conditions: list[Any] = [
            Trip.device_id == device_id,
            Trip.organization_id == org_id,
        ]
        if start_time:
            conditions.append(Trip.start_time >= start_time)
        if end_time:
            conditions.append(Trip.start_time <= end_time)
        result = await self.db.execute(
            select(Trip).where(*conditions).order_by(Trip.start_time.desc()).limit(limit)
        )
        return list(result.scalars().all())

    async def list_by_org(
        self, org_id: str, status_filter: str | None = None, limit: int = 50
    ) -> list[Trip]:
        conditions: list[Any] = [Trip.organization_id == org_id]
        if status_filter:
            conditions.append(Trip.status == status_filter)
        result = await self.db.execute(
            select(Trip).where(*conditions).order_by(Trip.start_time.desc()).limit(limit)
        )
        return list(result.scalars().all())

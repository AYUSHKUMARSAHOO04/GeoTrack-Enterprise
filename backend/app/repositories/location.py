from datetime import datetime
from typing import Any

from geoalchemy2 import functions as geo_func
from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Location


class LocationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, **kwargs: Any) -> Location:
        location = Location(**kwargs)
        self.db.add(location)
        await self.db.flush()
        return location

    async def get_by_id(self, location_id: str) -> Location | None:
        result = await self.db.execute(select(Location).where(Location.id == location_id))
        return result.scalar_one_or_none()

    async def exists_by_device_captured(self, device_id: str, captured_at: datetime) -> bool:
        result = await self.db.execute(
            select(func.count())
            .select_from(Location)
            .where(Location.device_id == device_id, Location.captured_at == captured_at)
        )
        return (result.scalar() or 0) > 0

    async def list_by_device(
        self,
        device_id: str,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 1000,
    ) -> list[Location]:
        conditions: list[Any] = [Location.device_id == device_id]
        if start_time:
            conditions.append(Location.captured_at >= start_time)
        if end_time:
            conditions.append(Location.captured_at <= end_time)
        result = await self.db.execute(
            select(Location).where(*conditions).order_by(Location.captured_at.asc()).limit(limit)
        )
        return list(result.scalars().all())

    async def get_latest_by_device(self, device_id: str) -> Location | None:
        result = await self.db.execute(
            select(Location)
            .where(Location.device_id == device_id)
            .order_by(Location.captured_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def find_within_radius(
        self,
        org_id: str,
        lat: float,
        lng: float,
        radius_meters: int,
        limit: int = 100,
    ) -> list[Location]:
        point = WKTElement(f"POINT({lng} {lat})", srid=4326)
        result = await self.db.execute(
            select(Location)
            .where(
                Location.organization_id == org_id,
                geo_func.ST_DWithin(Location.coordinates, point, radius_meters),
            )
            .order_by(geo_func.ST_Distance(Location.coordinates, point).asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def find_in_bbox(
        self,
        org_id: str,
        min_lat: float,
        max_lat: float,
        min_lng: float,
        max_lng: float,
        limit: int = 100,
    ) -> list[Location]:
        bbox = (
            f"POLYGON(({min_lng} {min_lat}, {max_lng} {min_lat}, "
            f"{max_lng} {max_lat}, {min_lng} {max_lat}, {min_lng} {min_lat}))"
        )
        polygon = WKTElement(bbox, srid=4326)
        result = await self.db.execute(
            select(Location)
            .where(
                Location.organization_id == org_id,
                geo_func.ST_Contains(polygon, Location.coordinates),
            )
            .order_by(Location.captured_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def find_nearest(
        self,
        org_id: str,
        lat: float,
        lng: float,
        limit: int = 10,
    ) -> list[tuple[Location, float]]:
        point = WKTElement(f"POINT({lng} {lat})", srid=4326)
        result = await self.db.execute(
            select(Location, geo_func.ST_Distance(Location.coordinates, point).label("distance"))
            .where(Location.organization_id == org_id)
            .order_by("distance")
            .limit(limit)
        )
        return [(row[0], float(row[1] or 0)) for row in result.all()]

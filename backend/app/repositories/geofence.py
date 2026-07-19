from typing import Any

from geoalchemy2 import functions as geo_func
from geoalchemy2.elements import WKTElement
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Geofence


class GeofenceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, **kwargs: Any) -> Geofence:
        geofence = Geofence(**kwargs)
        self.db.add(geofence)
        await self.db.flush()
        return geofence

    async def get_by_id(self, geofence_id: str, org_id: str) -> Geofence | None:
        result = await self.db.execute(
            select(Geofence).where(Geofence.id == geofence_id, Geofence.organization_id == org_id)
        )
        return result.scalar_one_or_none()

    async def list_by_org(
        self,
        org_id: str,
        include_archived: bool = False,
        enabled_only: bool = False,
    ) -> list[Geofence]:
        conditions: list[Any] = [Geofence.organization_id == org_id]
        if not include_archived:
            conditions.append(Geofence.is_archived.is_(False))
        if enabled_only:
            conditions.append(Geofence.is_enabled.is_(True))
        result = await self.db.execute(
            select(Geofence).where(*conditions).order_by(Geofence.priority.desc())
        )
        return list(result.scalars().all())

    async def update(self, geofence: Geofence, **kwargs: Any) -> Geofence:
        for key, value in kwargs.items():
            setattr(geofence, key, value)
        await self.db.flush()
        return geofence

    async def delete(self, geofence: Geofence) -> None:
        await self.db.delete(geofence)
        await self.db.flush()

    async def find_containing_point(self, org_id: str, lat: float, lng: float) -> list[Geofence]:
        point = WKTElement(f"POINT({lng} {lat})", srid=4326)
        result = await self.db.execute(
            select(Geofence).where(
                Geofence.organization_id == org_id,
                Geofence.is_enabled.is_(True),
                Geofence.is_archived.is_(False),
                geo_func.ST_Contains(Geofence.geometry, point),
            )
        )
        return list(result.scalars().all())

    async def find_within_circle(self, org_id: str, lat: float, lng: float) -> list[Geofence]:
        point = WKTElement(f"POINT({lng} {lat})", srid=4326)
        result = await self.db.execute(
            select(Geofence).where(
                Geofence.organization_id == org_id,
                Geofence.is_enabled.is_(True),
                Geofence.is_archived.is_(False),
                Geofence.geofence_type == "circle",
                geo_func.ST_DWithin(Geofence.center, point, Geofence.radius_meters),
            )
        )
        return list(result.scalars().all())

    async def check_device_in_geofence(self, geofence_id: str, lat: float, lng: float) -> bool:
        geofence = await self.db.get(Geofence, geofence_id)
        if not geofence:
            return False
        point = WKTElement(f"POINT({lng} {lat})", srid=4326)
        if geofence.geofence_type == "circle":
            result = await self.db.execute(
                select(geo_func.ST_DWithin(geofence.center, point, geofence.radius_meters))
            )
        else:
            result = await self.db.execute(select(geo_func.ST_Contains(geofence.geometry, point)))
        return bool(result.scalar())

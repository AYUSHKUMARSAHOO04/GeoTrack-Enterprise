from datetime import UTC, datetime
from typing import Any

from geoalchemy2.elements import WKTElement
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import RedisChannels, RedisService
from app.models import Device, Location
from app.repositories import (
    GeofenceEventRepository,
    GeofenceRepository,
    NotificationRepository,
)
from app.schemas import (
    CircleGeofenceCreate,
    GeofenceResponse,
    GeofenceUpdate,
    PolygonGeofenceCreate,
)

DWELL_THRESHOLD_SECONDS = 300
RAPID_REENTRY_THRESHOLD_SECONDS = 60


class GeofenceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.geofence_repo = GeofenceRepository(db)
        self.event_repo = GeofenceEventRepository(db)
        self.notif_repo = NotificationRepository(db)

    async def create_circle(self, org_id: str, data: CircleGeofenceCreate) -> GeofenceResponse:
        center = WKTElement(f"POINT({data.center_lng} {data.center_lat})", srid=4326)
        geofence = await self.geofence_repo.create(
            organization_id=org_id,
            name=data.name,
            description=data.description,
            center=center,
            radius_meters=data.radius_meters,
            geofence_type="circle",
            priority=data.priority,
            parent_geofence_id=data.parent_geofence_id,
            is_enabled=data.is_enabled,
            color=data.color,
            metadata_=data.metadata,
        )
        return GeofenceResponse.model_validate(geofence)

    async def create_polygon(self, org_id: str, data: PolygonGeofenceCreate) -> GeofenceResponse:
        coords = [(c["lng"], c["lat"]) for c in data.coordinates]
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        ring = ", ".join(f"{lng} {lat}" for lng, lat in coords)
        polygon = WKTElement(f"POLYGON(({ring}))", srid=4326)
        geofence = await self.geofence_repo.create(
            organization_id=org_id,
            name=data.name,
            description=data.description,
            geometry=polygon,
            geofence_type="polygon",
            priority=data.priority,
            parent_geofence_id=data.parent_geofence_id,
            is_enabled=data.is_enabled,
            color=data.color,
            metadata_=data.metadata,
        )
        return GeofenceResponse.model_validate(geofence)

    async def list_geofences(
        self, org_id: str, include_archived: bool = False
    ) -> list[GeofenceResponse]:
        geofences = await self.geofence_repo.list_by_org(org_id, include_archived)
        return [GeofenceResponse.model_validate(g) for g in geofences]

    async def get_geofence(self, org_id: str, geofence_id: str) -> GeofenceResponse:
        geofence = await self.geofence_repo.get_by_id(geofence_id, org_id)
        if not geofence:
            raise ValueError("Geofence not found")
        return GeofenceResponse.model_validate(geofence)

    async def update_geofence(
        self, org_id: str, geofence_id: str, data: GeofenceUpdate
    ) -> GeofenceResponse:
        geofence = await self.geofence_repo.get_by_id(geofence_id, org_id)
        if not geofence:
            raise ValueError("Geofence not found")
        updates: dict[str, Any] = data.model_dump(exclude_unset=True)
        if "metadata" in updates:
            updates["metadata_"] = updates.pop("metadata")
        geofence = await self.geofence_repo.update(geofence, **updates)
        return GeofenceResponse.model_validate(geofence)

    async def delete_geofence(self, org_id: str, geofence_id: str) -> None:
        geofence = await self.geofence_repo.get_by_id(geofence_id, org_id)
        if not geofence:
            raise ValueError("Geofence not found")
        await self.geofence_repo.delete(geofence)

    async def archive_geofence(self, org_id: str, geofence_id: str) -> GeofenceResponse:
        return await self.update_geofence(org_id, geofence_id, GeofenceUpdate(is_archived=True))

    async def toggle_enable(self, org_id: str, geofence_id: str, enabled: bool) -> GeofenceResponse:
        return await self.update_geofence(org_id, geofence_id, GeofenceUpdate(is_enabled=enabled))

    async def check_location(self, device: Device, location: Location) -> None:
        lat = location.latitude
        lng = location.longitude

        polygon_geofences = await self.geofence_repo.find_containing_point(
            device.organization_id, lat, lng
        )
        circle_geofences = await self.geofence_repo.find_within_circle(
            device.organization_id, lat, lng
        )
        containing = polygon_geofences + circle_geofences
        containing_ids = {g.id for g in containing}

        all_geofences = await self.geofence_repo.list_by_org(
            device.organization_id, enabled_only=True
        )

        for geofence in all_geofences:
            was_inside = await self._was_device_inside(geofence.id, device.id)
            is_inside = geofence.id in containing_ids

            if is_inside and not was_inside:
                await self._create_event(geofence.id, device, location, "enter")
            elif not is_inside and was_inside:
                await self._create_event(geofence.id, device, location, "exit")

        for geofence in containing:
            await self._check_dwell(geofence, device, location)

    async def _was_device_inside(self, geofence_id: str, device_id: str) -> bool:
        latest = await self.event_repo.get_latest_for_device_geofence(device_id, geofence_id)
        if not latest:
            return False
        return latest.event_type in ("enter", "dwell")

    async def _create_event(
        self,
        geofence_id: str,
        device: Device,
        location: Location,
        event_type: str,
        duration_seconds: int | None = None,
    ) -> None:
        event = await self.event_repo.create(
            geofence_id=geofence_id,
            device_id=device.id,
            organization_id=device.organization_id,
            event_type=event_type,
            location_id=location.id,
            latitude=location.latitude,
            longitude=location.longitude,
            duration_seconds=duration_seconds,
        )

        channel = (
            RedisChannels.GEOFENCE_ENTER
            if event_type == "enter"
            else RedisChannels.GEOFENCE_EXIT
            if event_type == "exit"
            else RedisChannels.GEOFENCE_DWELL
        )
        await RedisService.publish(
            channel,
            {
                "event_id": event.id,
                "geofence_id": geofence_id,
                "device_id": device.id,
                "organization_id": device.organization_id,
                "event_type": event_type,
                "latitude": location.latitude,
                "longitude": location.longitude,
                "duration_seconds": duration_seconds,
            },
        )

    async def _check_dwell(self, geofence: Any, device: Device, location: Location) -> None:
        latest = await self.event_repo.get_latest_for_device_geofence(device.id, geofence.id)
        if latest and latest.event_type == "enter":
            dwell_time = (datetime.now(UTC) - latest.created_at).total_seconds()
            if dwell_time >= DWELL_THRESHOLD_SECONDS:
                await self._create_event(
                    geofence.id,
                    device,
                    location,
                    "dwell",
                    duration_seconds=int(dwell_time),
                )

    async def list_events(
        self,
        org_id: str,
        geofence_id: str | None = None,
        device_id: str | None = None,
        event_type: str | None = None,
        limit: int = 100,
    ) -> list[Any]:
        events = await self.event_repo.list_by_org(
            org_id, geofence_id, device_id, event_type, limit
        )
        return events

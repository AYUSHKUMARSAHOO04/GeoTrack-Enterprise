import hashlib
from datetime import UTC, datetime, timedelta

from geoalchemy2.elements import WKTElement
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import RedisChannels, RedisService
from app.models import Device, DeviceStatus, Location, Trip
from app.repositories import (
    DeviceRepository,
    DeviceStatusRepository,
    LocationRepository,
    TripRepository,
)
from app.schemas import LocationIngest, LocationResponse
from app.services.alert_engine import AlertEngineService
from app.services.geofence import GeofenceService

MOVING_SPEED_THRESHOLD = 5.0
IDLE_TIMEOUT_SECONDS = 300
OFFLINE_TIMEOUT_SECONDS = 600
TRIP_GAP_THRESHOLD_SECONDS = 600


class LocationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.location_repo = LocationRepository(db)
        self.device_repo = DeviceRepository(db)
        self.status_repo = DeviceStatusRepository(db)
        self.trip_repo = TripRepository(db)

    async def ingest_single(self, device: Device, data: LocationIngest) -> LocationResponse | None:
        if await self.location_repo.exists_by_device_captured(device.id, data.captured_at):
            return None

        now = datetime.now(UTC)
        if data.captured_at > now + timedelta(minutes=5):
            raise ValueError("captured_at is too far in the future")

        payload_hash = self._compute_hash(device.id, data)
        point = WKTElement(f"POINT({data.longitude} {data.latitude})", srid=4326)

        location = await self.location_repo.create(
            device_id=device.id,
            organization_id=device.organization_id,
            coordinates=point,
            latitude=data.latitude,
            longitude=data.longitude,
            accuracy=data.accuracy,
            altitude=data.altitude,
            heading=data.heading,
            speed=data.speed,
            battery_level=data.battery_level,
            signal_strength=data.signal_strength,
            provider=data.provider,
            captured_at=data.captured_at,
            received_at=now,
            payload_hash=payload_hash,
        )

        await self._update_device_status(device, location)
        await self._detect_and_update_trip(device, location)

        geofence_service = GeofenceService(self.db)
        await geofence_service.check_location(device, location)

        alert_engine = AlertEngineService(self.db)
        status = await self.status_repo.get_by_device(device.id)
        await alert_engine.evaluate_location(device, location, status)

        await RedisService.publish(
            RedisChannels.LOCATION_UPDATED,
            {
                "device_id": device.id,
                "organization_id": device.organization_id,
                "latitude": data.latitude,
                "longitude": data.longitude,
                "heading": data.heading,
                "speed": data.speed,
                "battery_level": data.battery_level,
                "captured_at": data.captured_at.isoformat(),
            },
        )

        return LocationResponse.model_validate(location)

    async def ingest_batch(
        self, device: Device, locations: list[LocationIngest]
    ) -> list[LocationResponse]:
        results: list[LocationResponse] = []
        for loc in locations:
            result = await self.ingest_single(device, loc)
            if result is not None:
                results.append(result)
        return results

    async def get_device_history(
        self,
        org_id: str,
        device_id: str,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 1000,
    ) -> list[LocationResponse]:
        device = await self.device_repo.get_by_id(device_id, org_id)
        if not device:
            raise ValueError("Device not found")
        locations = await self.location_repo.list_by_device(device_id, start_time, end_time, limit)
        return [LocationResponse.model_validate(loc) for loc in locations]

    async def get_device_statuses(self, org_id: str) -> list[DeviceStatus]:
        return await self.status_repo.list_by_org(org_id)

    async def get_trips(
        self,
        org_id: str,
        device_id: str | None = None,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
    ) -> list[Trip]:
        if device_id:
            return await self.trip_repo.list_by_device(device_id, org_id, start_time, end_time)
        return await self.trip_repo.list_by_org(org_id)

    async def get_trip_history(self, org_id: str, trip_id: str) -> list[LocationResponse]:
        trip = await self.trip_repo.get_by_id(trip_id, org_id)
        if not trip:
            raise ValueError("Trip not found")
        return await self.get_device_history(org_id, trip.device_id, trip.start_time, trip.end_time)

    async def find_within_radius(
        self, org_id: str, lat: float, lng: float, radius_meters: int
    ) -> list[LocationResponse]:
        locations = await self.location_repo.find_within_radius(org_id, lat, lng, radius_meters)
        return [LocationResponse.model_validate(loc) for loc in locations]

    async def find_in_bbox(
        self,
        org_id: str,
        min_lat: float,
        max_lat: float,
        min_lng: float,
        max_lng: float,
    ) -> list[LocationResponse]:
        locations = await self.location_repo.find_in_bbox(
            org_id, min_lat, max_lat, min_lng, max_lng
        )
        return [LocationResponse.model_validate(loc) for loc in locations]

    async def find_nearest(
        self, org_id: str, lat: float, lng: float, limit: int = 10
    ) -> list[tuple[LocationResponse, float]]:
        results = await self.location_repo.find_nearest(org_id, lat, lng, limit)
        return [(LocationResponse.model_validate(loc), dist) for loc, dist in results]

    async def _update_device_status(self, device: Device, location: Location) -> None:
        speed = location.speed or 0
        if speed > MOVING_SPEED_THRESHOLD:
            new_status = "moving"
        elif speed > 0:
            new_status = "idle"
        else:
            new_status = "stopped"

        existing = await self.status_repo.get_by_device(device.id)
        old_status = existing.status if existing else "offline"

        await self.status_repo.upsert(
            device.id,
            device.organization_id,
            status=new_status,
            last_location_id=location.id,
            last_latitude=location.latitude,
            last_longitude=location.longitude,
            last_heading=location.heading,
            last_speed=location.speed,
            last_battery_level=location.battery_level,
            last_captured_at=location.captured_at,
            last_received_at=location.received_at,
        )

        if old_status == "offline" and new_status != "offline":
            await RedisService.publish(
                RedisChannels.DEVICE_ONLINE,
                {"device_id": device.id, "organization_id": device.organization_id},
            )

    async def _detect_and_update_trip(self, device: Device, location: Location) -> None:
        active_trip = await self.trip_repo.get_active_trip(device.id)
        speed = location.speed or 0

        if speed > MOVING_SPEED_THRESHOLD:
            if active_trip is None:
                start_point = WKTElement(
                    f"POINT({location.longitude} {location.latitude})", srid=4326
                )
                active_trip = await self.trip_repo.create(
                    device_id=device.id,
                    organization_id=device.organization_id,
                    start_time=location.captured_at,
                    start_location=start_point,
                    status="active",
                    point_count=1,
                )
                await RedisService.publish(
                    RedisChannels.TRIP_STARTED,
                    {
                        "trip_id": active_trip.id,
                        "device_id": device.id,
                        "organization_id": device.organization_id,
                        "start_time": location.captured_at.isoformat(),
                    },
                )
            else:
                last_loc = await self.location_repo.get_latest_by_device(device.id)
                if last_loc and last_loc.id != location.id:
                    distance = self._haversine(
                        last_loc.latitude,
                        last_loc.longitude,
                        location.latitude,
                        location.longitude,
                    )
                    active_trip.distance_meters += distance
                    active_trip.point_count += 1
                    if speed > (active_trip.max_speed_kmh or 0):
                        active_trip.max_speed_kmh = speed
                    await self.trip_repo.update(active_trip)
        else:
            if active_trip is not None:
                gap = (datetime.now(UTC) - active_trip.start_time).total_seconds()
                if gap > TRIP_GAP_THRESHOLD_SECONDS:
                    await self._end_trip(active_trip, location)

    async def _end_trip(self, trip: Trip, location: Location) -> None:
        end_point = WKTElement(f"POINT({location.longitude} {location.latitude})", srid=4326)
        duration = (location.captured_at - trip.start_time).total_seconds()
        avg_speed = (trip.distance_meters / 1000) / (duration / 3600) if duration > 0 else 0

        await self.trip_repo.update(
            trip,
            end_time=location.captured_at,
            end_location=end_point,
            duration_seconds=int(duration),
            avg_speed_kmh=round(avg_speed, 2),
            status="completed",
        )

        await RedisService.publish(
            RedisChannels.TRIP_ENDED,
            {
                "trip_id": trip.id,
                "device_id": trip.device_id,
                "organization_id": trip.organization_id,
                "distance_meters": trip.distance_meters,
                "duration_seconds": int(duration),
            },
        )

    def _compute_hash(self, device_id: str, data: LocationIngest) -> str:
        raw = f"{device_id}:{data.captured_at.isoformat()}:{data.latitude}:{data.longitude}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def _haversine(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        import math

        r = 6371000.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lng2 - lng1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
        return 2 * r * math.asin(math.sqrt(a))

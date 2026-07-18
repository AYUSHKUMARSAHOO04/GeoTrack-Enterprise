from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LocationIngest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy: float | None = Field(default=None, ge=0)
    altitude: float | None = None
    heading: float | None = Field(default=None, ge=0, le=360)
    speed: float | None = Field(default=None, ge=0)
    battery_level: float | None = Field(default=None, ge=0, le=100)
    signal_strength: float | None = None
    provider: str | None = Field(default=None, max_length=20)
    captured_at: datetime


class BatchLocationIngest(BaseModel):
    locations: list[LocationIngest] = Field(max_length=500)


class LocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    device_id: str
    organization_id: str
    latitude: float
    longitude: float
    accuracy: float | None
    altitude: float | None
    heading: float | None
    speed: float | None
    battery_level: float | None
    signal_strength: float | None
    provider: str | None
    captured_at: datetime
    received_at: datetime


class DeviceStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    device_id: str
    organization_id: str
    status: str
    last_latitude: float | None
    last_longitude: float | None
    last_heading: float | None
    last_speed: float | None
    last_battery_level: float | None
    last_captured_at: datetime | None
    last_received_at: datetime | None
    current_trip_id: str | None
    updated_at: datetime


class TripResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    device_id: str
    organization_id: str
    start_time: datetime
    end_time: datetime | None
    distance_meters: float
    duration_seconds: int | None
    avg_speed_kmh: float | None
    max_speed_kmh: float | None
    idle_duration_seconds: int
    point_count: int
    status: str
    created_at: datetime
    updated_at: datetime


class DeviceCredentialResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    device_id: str
    api_key_prefix: str
    status: str
    issued_at: datetime
    expires_at: datetime | None
    last_used_at: datetime | None


class DeviceCredentialCreateResponse(BaseModel):
    credential: DeviceCredentialResponse
    api_key: str
    secret: str


class SpatialQueryParams(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radius_meters: int = Field(default=1000, ge=1, le=100000)


class BoundingBoxParams(BaseModel):
    min_lat: float = Field(ge=-90, le=90)
    max_lat: float = Field(ge=-90, le=90)
    min_lng: float = Field(ge=-180, le=180)
    max_lng: float = Field(ge=-180, le=180)

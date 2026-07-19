from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class GeofenceBase(BaseModel):
    name: str = Field(max_length=255)
    description: str | None = None
    geofence_type: str = Field(pattern="^(polygon|circle)$")
    priority: int = Field(default=0, ge=0)
    parent_geofence_id: str | None = None
    is_enabled: bool = True
    color: str | None = None
    metadata: dict[str, Any] | None = None


class CircleGeofenceCreate(GeofenceBase):
    geofence_type: str = Field(default="circle", pattern="^circle$")
    center_lat: float = Field(ge=-90, le=90)
    center_lng: float = Field(ge=-180, le=180)
    radius_meters: float = Field(gt=0, le=1000000)


class PolygonGeofenceCreate(GeofenceBase):
    geofence_type: str = Field(default="polygon", pattern="^polygon$")
    coordinates: list[dict[str, float]] = Field(min_length=3)


class GeofenceUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = None
    priority: int | None = Field(default=None, ge=0)
    is_enabled: bool | None = None
    is_archived: bool | None = None
    color: str | None = None
    metadata: dict[str, Any] | None = None


class GeofenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    name: str
    description: str | None
    geofence_type: str
    radius_meters: float | None
    priority: int
    parent_geofence_id: str | None
    is_enabled: bool
    is_archived: bool
    color: str | None
    metadata: dict[str, Any] | None = Field(default=None, validation_alias="metadata_")
    created_at: datetime
    updated_at: datetime


class GeofenceEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    geofence_id: str
    device_id: str
    organization_id: str
    event_type: str
    latitude: float
    longitude: float
    duration_seconds: int | None
    created_at: datetime


class AlertRuleBase(BaseModel):
    name: str = Field(max_length=255)
    description: str | None = None
    rule_type: str
    conditions: dict[str, Any] = Field(default_factory=dict)
    severity: str = Field(default="warning", pattern="^(info|warning|critical)$")
    priority: int = Field(default=0, ge=0)
    is_enabled: bool = True
    schedule_start: str | None = None
    schedule_end: str | None = None
    schedule_days: list[int] | None = None
    geofence_id: str | None = None


class AlertRuleCreate(AlertRuleBase):
    pass


class AlertRuleUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = None
    conditions: dict[str, Any] | None = None
    severity: str | None = Field(default=None, pattern="^(info|warning|critical)$")
    priority: int | None = Field(default=None, ge=0)
    is_enabled: bool | None = None
    schedule_start: str | None = None
    schedule_end: str | None = None
    schedule_days: list[int] | None = None
    geofence_id: str | None = None


class AlertRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    name: str
    description: str | None
    rule_type: str
    conditions: dict[str, Any]
    severity: str
    priority: int
    is_enabled: bool
    schedule_start: str | None
    schedule_end: str | None
    schedule_days: list[int] | None
    geofence_id: str | None
    created_at: datetime
    updated_at: datetime


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    device_id: str
    rule_id: str | None
    alert_type: str
    severity: str
    title: str
    message: str
    metadata: dict[str, Any] | None = Field(default=None, validation_alias="metadata_")
    state: str
    acknowledged_by: str | None
    acknowledged_at: datetime | None
    resolved_by: str | None
    resolved_at: datetime | None
    triggered_at: datetime
    created_at: datetime


class AlertAcknowledge(BaseModel):
    pass


class AlertResolve(BaseModel):
    pass


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    user_id: str
    notification_type: str
    title: str
    message: str
    resource_type: str | None
    resource_id: str | None
    is_read: bool
    created_at: datetime


class FleetAnalytics(BaseModel):
    active_devices: int
    moving_devices: int
    idle_devices: int
    offline_devices: int
    total_devices: int
    fleet_utilization_pct: float
    avg_speed_kmh: float
    trips_today: int
    distance_today_meters: float
    alerts_today: int
    alerts_open: int
    geofences_active: int


class SearchResponse(BaseModel):
    devices: list[dict[str, Any]]
    teams: list[dict[str, Any]]
    trips: list[dict[str, Any]]
    geofences: list[dict[str, Any]]
    alerts: list[dict[str, Any]]
    total: int

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class DeviceCreate(BaseModel):
    name: str
    external_identifier: str | None = None
    device_type: str = "vehicle_tracker"
    assigned_team_id: str | None = None
    metadata: dict[str, Any] | None = None


class DeviceUpdate(BaseModel):
    name: str | None = None
    external_identifier: str | None = None
    device_type: str | None = None
    status: str | None = None
    assigned_team_id: str | None = None
    metadata: dict[str, Any] | None = None


class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    name: str
    external_identifier: str | None
    device_type: str
    status: str
    assigned_team_id: str | None
    metadata: dict[str, Any] | None
    last_seen_at: datetime | None
    created_at: datetime
    updated_at: datetime


class DeviceListParams(BaseModel):
    page: int = 1
    page_size: int = 20
    search: str | None = None
    status: str | None = None
    team_id: str | None = None

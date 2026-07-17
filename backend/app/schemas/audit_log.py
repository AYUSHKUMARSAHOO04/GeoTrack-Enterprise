from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str | None
    organization_id: str | None
    action: str
    resource: str
    resource_id: str | None
    metadata: dict[str, Any] | None
    ip_address: str | None
    created_at: datetime


class AuditLogListParams(BaseModel):
    page: int = 1
    page_size: int = 50
    action: str | None = None
    resource: str | None = None
    user_id: str | None = None
    start_date: str | None = None
    end_date: str | None = None

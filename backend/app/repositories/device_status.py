from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DeviceStatus


class DeviceStatusRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_device(self, device_id: str) -> DeviceStatus | None:
        result = await self.db.execute(
            select(DeviceStatus).where(DeviceStatus.device_id == device_id)
        )
        return result.scalar_one_or_none()

    async def upsert(self, device_id: str, org_id: str, **kwargs: Any) -> DeviceStatus:
        status = await self.get_by_device(device_id)
        if status is None:
            status = DeviceStatus(device_id=device_id, organization_id=org_id, **kwargs)
            self.db.add(status)
        else:
            for key, value in kwargs.items():
                setattr(status, key, value)
        await self.db.flush()
        return status

    async def list_by_org(
        self, org_id: str, status_filter: str | None = None
    ) -> list[DeviceStatus]:
        conditions: list[Any] = [DeviceStatus.organization_id == org_id]
        if status_filter:
            conditions.append(DeviceStatus.status == status_filter)
        result = await self.db.execute(select(DeviceStatus).where(*conditions))
        return list(result.scalars().all())

    async def list_offline_since(self, org_id: str, threshold: datetime) -> list[DeviceStatus]:
        result = await self.db.execute(
            select(DeviceStatus).where(
                DeviceStatus.organization_id == org_id,
                DeviceStatus.status != "offline",
                DeviceStatus.last_received_at < threshold,
            )
        )
        return list(result.scalars().all())

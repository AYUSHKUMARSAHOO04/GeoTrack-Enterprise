from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Device


class DeviceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list(
        self,
        org_id: str,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        status: str | None = None,
        team_id: str | None = None,
    ) -> tuple[list[Device], int]:
        conditions = [Device.organization_id == org_id, Device.is_deleted.is_(False)]

        if search:
            conditions.append(
                or_(
                    Device.name.ilike(f"%{search}%"),
                    Device.external_identifier.ilike(f"%{search}%"),
                )
            )
        if status:
            conditions.append(Device.status == status)
        if team_id:
            conditions.append(Device.assigned_team_id == team_id)

        count_q = select(func.count()).select_from(Device).where(*conditions)
        total = (await self.db.execute(count_q)).scalar() or 0

        q = (
            select(Device)
            .where(*conditions)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .order_by(Device.created_at.desc())
        )
        result = await self.db.execute(q)
        return list(result.scalars().all()), total

    async def get_by_id(self, device_id: str, org_id: str) -> Device | None:
        result = await self.db.execute(
            select(Device).where(
                Device.id == device_id,
                Device.organization_id == org_id,
                Device.is_deleted.is_(False),
            )
        )
        return result.scalar_one_or_none()

    async def create(self, org_id: str, **kwargs: object) -> Device:
        device = Device(organization_id=org_id, **kwargs)
        self.db.add(device)
        await self.db.flush()
        return device

    async def update(self, device: Device, **kwargs: object) -> Device:
        for key, value in kwargs.items():
            if hasattr(device, key) and value is not None:
                setattr(device, key, value)
        await self.db.flush()
        return device

    async def soft_delete(self, device: Device) -> Device:
        device.is_deleted = True
        device.status = "retired"
        await self.db.flush()
        return device

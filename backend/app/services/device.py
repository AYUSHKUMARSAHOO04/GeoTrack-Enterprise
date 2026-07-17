from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import AuthContext
from app.models import Device
from app.repositories import AuditLogRepository, DeviceRepository, TeamRepository
from app.schemas import DeviceCreate, DeviceResponse, DeviceUpdate


class DeviceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.device_repo = DeviceRepository(db)
        self.team_repo = TeamRepository(db)
        self.audit_repo = AuditLogRepository(db)

    async def list_devices(
        self,
        ctx: AuthContext,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        status_filter: str | None = None,
        team_id: str | None = None,
    ) -> tuple[list[DeviceResponse], int]:
        devices, total = await self.device_repo.list(
            ctx.organization_id, page, page_size, search, status_filter, team_id
        )
        return [DeviceResponse.model_validate(d) for d in devices], total

    async def get_device(self, ctx: AuthContext, device_id: str) -> DeviceResponse:
        device = await self._get_device_or_404(ctx.organization_id, device_id)
        return DeviceResponse.model_validate(device)

    async def create_device(self, ctx: AuthContext, data: DeviceCreate) -> DeviceResponse:
        if data.assigned_team_id:
            await self._validate_team_belongs_to_org(ctx.organization_id, data.assigned_team_id)

        device = await self.device_repo.create(
            ctx.organization_id,
            name=data.name,
            external_identifier=data.external_identifier,
            device_type=data.device_type,
            status="active",
            assigned_team_id=data.assigned_team_id,
            metadata_=data.metadata,
        )
        await self.audit_repo.create(
            user_id=ctx.user_id,
            org_id=ctx.organization_id,
            action="device.created",
            resource="device",
            resource_id=device.id,
            metadata={"name": data.name, "device_type": data.device_type},
        )
        return DeviceResponse.model_validate(device)

    async def update_device(
        self, ctx: AuthContext, device_id: str, data: DeviceUpdate
    ) -> DeviceResponse:
        device = await self._get_device_or_404(ctx.organization_id, device_id)

        if data.assigned_team_id:
            await self._validate_team_belongs_to_org(ctx.organization_id, data.assigned_team_id)

        update_data = data.model_dump(exclude_unset=True)
        if "metadata" in update_data:
            update_data["metadata_"] = update_data.pop("metadata")

        device = await self.device_repo.update(device, **update_data)
        await self.audit_repo.create(
            user_id=ctx.user_id,
            org_id=ctx.organization_id,
            action="device.updated",
            resource="device",
            resource_id=device.id,
            metadata=update_data,
        )
        return DeviceResponse.model_validate(device)

    async def delete_device(self, ctx: AuthContext, device_id: str) -> None:
        device = await self._get_device_or_404(ctx.organization_id, device_id)
        await self.audit_repo.create(
            user_id=ctx.user_id,
            org_id=ctx.organization_id,
            action="device.deleted",
            resource="device",
            resource_id=device.id,
            metadata={"name": device.name},
        )
        await self.device_repo.soft_delete(device)

    async def _get_device_or_404(self, org_id: str, device_id: str) -> Device:
        device = await self.device_repo.get_by_id(device_id, org_id)
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
        return device

    async def _validate_team_belongs_to_org(self, org_id: str, team_id: str) -> None:
        team = await self.team_repo.get_by_id(team_id, org_id)
        if not team:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned team does not belong to this organization",
            )

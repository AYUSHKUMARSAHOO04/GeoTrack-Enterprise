from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import AuthContext
from app.repositories import AuditLogRepository, OrganizationRepository, ProfileRepository
from app.schemas import OrganizationResponse, OrganizationUpdate
from app.schemas.profile import ProfileResponse


class OrganizationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.org_repo = OrganizationRepository(db)
        self.profile_repo = ProfileRepository(db)
        self.audit_repo = AuditLogRepository(db)

    async def get_current_org(self, ctx: AuthContext) -> OrganizationResponse:
        org = await self.org_repo.get_by_id(ctx.organization_id)
        if not org:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
            )
        return OrganizationResponse.model_validate(org)

    async def update_org(self, ctx: AuthContext, data: OrganizationUpdate) -> OrganizationResponse:
        org = await self.org_repo.get_by_id(ctx.organization_id)
        if not org:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
            )
        org = await self.org_repo.update(org, name=data.name, plan=data.plan)
        await self.audit_repo.create(
            user_id=ctx.user_id,
            org_id=ctx.organization_id,
            action="organization.updated",
            resource="organization",
            resource_id=org.id,
            metadata={"name": data.name, "plan": data.plan},
        )
        return OrganizationResponse.model_validate(org)

    async def list_members(self, ctx: AuthContext) -> list[ProfileResponse]:
        members = await self.profile_repo.list_by_organization(ctx.organization_id)
        return [ProfileResponse.model_validate(m) for m in members]

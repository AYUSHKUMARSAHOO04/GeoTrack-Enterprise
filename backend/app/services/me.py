from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import ROLE_PERMISSIONS, AuthContext, Role
from app.repositories import OrganizationRepository, ProfileRepository
from app.schemas import MeResponse, OrganizationBrief, ProfileUpdate


class MeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.profile_repo = ProfileRepository(db)
        self.org_repo = OrganizationRepository(db)

    async def get_me(self, ctx: AuthContext) -> MeResponse:
        org = None
        if ctx.organization_id:
            org_model = await self.org_repo.get_by_id(ctx.organization_id)
            if org_model:
                org = OrganizationBrief(
                    id=org_model.id,
                    name=org_model.name,
                    slug=org_model.slug,
                    plan=org_model.plan,
                )
        permissions = list(ROLE_PERMISSIONS.get(Role(ctx.role), set()))
        return MeResponse(
            id=ctx.user_id,
            email=ctx.profile.email,
            first_name=ctx.profile.first_name,
            last_name=ctx.profile.last_name,
            role=ctx.role,
            organization=org,
            permissions=permissions,
        )

    async def update_profile(self, ctx: AuthContext, data: ProfileUpdate) -> MeResponse:
        await self.profile_repo.update(
            ctx.profile,
            first_name=data.first_name,
            last_name=data.last_name,
            avatar_url=data.avatar_url,
        )
        return await self.get_me(ctx)

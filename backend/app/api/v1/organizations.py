from fastapi import Depends
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import AuthContext, require_permission
from app.schemas import OrganizationResponse, OrganizationUpdate
from app.schemas.profile import ProfileResponse
from app.services import OrganizationService

router = APIRouter()


@router.get("/organizations/me", response_model=OrganizationResponse)
async def get_current_org(
    ctx: AuthContext = Depends(require_permission("organizations:read")),
    db: AsyncSession = Depends(get_db),
) -> OrganizationResponse:
    service = OrganizationService(db)
    return await service.get_current_org(ctx)


@router.patch("/organizations/me", response_model=OrganizationResponse)
async def update_current_org(
    data: OrganizationUpdate,
    ctx: AuthContext = Depends(require_permission("organizations:update")),
    db: AsyncSession = Depends(get_db),
) -> OrganizationResponse:
    service = OrganizationService(db)
    return await service.update_org(ctx, data)


@router.get("/organizations/me/members", response_model=list[ProfileResponse])
async def list_org_members(
    ctx: AuthContext = Depends(require_permission("members:read")),
    db: AsyncSession = Depends(get_db),
) -> list[ProfileResponse]:
    service = OrganizationService(db)
    return await service.list_members(ctx)

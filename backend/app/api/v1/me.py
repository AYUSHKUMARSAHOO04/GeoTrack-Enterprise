from fastapi import Depends
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import AuthContext, get_auth_context
from app.schemas import MeResponse, ProfileUpdate
from app.services import MeService

router = APIRouter()


@router.get("/me", response_model=MeResponse)
async def get_me(
    ctx: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
) -> MeResponse:
    service = MeService(db)
    return await service.get_me(ctx)


@router.patch("/me", response_model=MeResponse)
async def update_me(
    data: ProfileUpdate,
    ctx: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
) -> MeResponse:
    service = MeService(db)
    return await service.update_profile(ctx, data)

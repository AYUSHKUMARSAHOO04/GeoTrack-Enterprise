from fastapi import Depends, Query
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import AuthContext, require_permission
from app.schemas import (
    AddMemberRequest,
    PaginatedResponse,
    TeamCreate,
    TeamMemberResponse,
    TeamResponse,
    TeamUpdate,
)
from app.services import TeamService

router = APIRouter()


@router.get("/teams", response_model=PaginatedResponse[TeamResponse])
async def list_teams(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    ctx: AuthContext = Depends(require_permission("teams:read")),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[TeamResponse]:
    service = TeamService(db)
    items, total = await service.list_teams(ctx, page, page_size)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/teams", response_model=TeamResponse, status_code=201)
async def create_team(
    data: TeamCreate,
    ctx: AuthContext = Depends(require_permission("teams:create")),
    db: AsyncSession = Depends(get_db),
) -> TeamResponse:
    service = TeamService(db)
    return await service.create_team(ctx, data)


@router.get("/teams/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: str,
    ctx: AuthContext = Depends(require_permission("teams:read")),
    db: AsyncSession = Depends(get_db),
) -> TeamResponse:
    service = TeamService(db)
    return await service.get_team(ctx, team_id)


@router.patch("/teams/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: str,
    data: TeamUpdate,
    ctx: AuthContext = Depends(require_permission("teams:update")),
    db: AsyncSession = Depends(get_db),
) -> TeamResponse:
    service = TeamService(db)
    return await service.update_team(ctx, team_id, data)


@router.delete("/teams/{team_id}", status_code=204)
async def delete_team(
    team_id: str,
    ctx: AuthContext = Depends(require_permission("teams:delete")),
    db: AsyncSession = Depends(get_db),
) -> None:
    service = TeamService(db)
    await service.delete_team(ctx, team_id)


@router.get("/teams/{team_id}/members", response_model=list[TeamMemberResponse])
async def list_team_members(
    team_id: str,
    ctx: AuthContext = Depends(require_permission("teams:read")),
    db: AsyncSession = Depends(get_db),
) -> list[TeamMemberResponse]:
    service = TeamService(db)
    return await service.list_members(ctx, team_id)


@router.post("/teams/{team_id}/members", response_model=TeamMemberResponse, status_code=201)
async def add_team_member(
    team_id: str,
    data: AddMemberRequest,
    ctx: AuthContext = Depends(require_permission("members:manage")),
    db: AsyncSession = Depends(get_db),
) -> TeamMemberResponse:
    service = TeamService(db)
    return await service.add_member(ctx, team_id, data.user_id, data.role)


@router.delete("/teams/{team_id}/members/{user_id}", status_code=204)
async def remove_team_member(
    team_id: str,
    user_id: str,
    ctx: AuthContext = Depends(require_permission("members:manage")),
    db: AsyncSession = Depends(get_db),
) -> None:
    service = TeamService(db)
    await service.remove_member(ctx, team_id, user_id)

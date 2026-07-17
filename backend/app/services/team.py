from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import AuthContext
from app.models import Team
from app.repositories import AuditLogRepository, ProfileRepository, TeamRepository
from app.schemas import TeamCreate, TeamMemberResponse, TeamResponse, TeamUpdate


class TeamService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.team_repo = TeamRepository(db)
        self.audit_repo = AuditLogRepository(db)

    async def list_teams(
        self, ctx: AuthContext, page: int = 1, page_size: int = 50
    ) -> tuple[list[TeamResponse], int]:
        teams, total = await self.team_repo.list_by_org(ctx.organization_id, page, page_size)
        return [TeamResponse.model_validate(t) for t in teams], total

    async def get_team(self, ctx: AuthContext, team_id: str) -> TeamResponse:
        team = await self._get_team_or_404(ctx.organization_id, team_id)
        return TeamResponse.model_validate(team)

    async def create_team(self, ctx: AuthContext, data: TeamCreate) -> TeamResponse:
        team = await self.team_repo.create(ctx.organization_id, data.name, data.description)
        await self.audit_repo.create(
            user_id=ctx.user_id,
            org_id=ctx.organization_id,
            action="team.created",
            resource="team",
            resource_id=team.id,
            metadata={"name": data.name},
        )
        return TeamResponse.model_validate(team)

    async def update_team(self, ctx: AuthContext, team_id: str, data: TeamUpdate) -> TeamResponse:
        team = await self._get_team_or_404(ctx.organization_id, team_id)
        team = await self.team_repo.update(team, name=data.name, description=data.description)
        await self.audit_repo.create(
            user_id=ctx.user_id,
            org_id=ctx.organization_id,
            action="team.updated",
            resource="team",
            resource_id=team.id,
            metadata={"name": data.name, "description": data.description},
        )
        return TeamResponse.model_validate(team)

    async def delete_team(self, ctx: AuthContext, team_id: str) -> None:
        team = await self._get_team_or_404(ctx.organization_id, team_id)
        await self.audit_repo.create(
            user_id=ctx.user_id,
            org_id=ctx.organization_id,
            action="team.deleted",
            resource="team",
            resource_id=team.id,
            metadata={"name": team.name},
        )
        await self.team_repo.delete(team)

    async def list_members(self, ctx: AuthContext, team_id: str) -> list[TeamMemberResponse]:
        await self._get_team_or_404(ctx.organization_id, team_id)
        members = await self.team_repo.list_members(team_id)
        result: list[TeamMemberResponse] = []
        for member, profile in members:
            result.append(
                TeamMemberResponse(
                    id=member.id,
                    team_id=member.team_id,
                    user_id=member.user_id,
                    role=member.role,
                    created_at=member.created_at,
                    email=profile.email,
                    first_name=profile.first_name,
                    last_name=profile.last_name,
                )
            )
        return result

    async def add_member(
        self, ctx: AuthContext, team_id: str, user_id: str, role: str = "member"
    ) -> TeamMemberResponse:
        await self._get_team_or_404(ctx.organization_id, team_id)
        profile_repo = ProfileRepository(self.db)
        profile = await profile_repo.get_by_id(user_id)
        if not profile or profile.organization_id != ctx.organization_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User does not belong to this organization",
            )
        member = await self.team_repo.add_member(team_id, user_id, role)
        await self.audit_repo.create(
            user_id=ctx.user_id,
            org_id=ctx.organization_id,
            action="team.member_added",
            resource="team",
            resource_id=team_id,
            metadata={"user_id": user_id, "role": role},
        )
        return TeamMemberResponse(
            id=member.id,
            team_id=member.team_id,
            user_id=member.user_id,
            role=member.role,
            created_at=member.created_at,
            email=profile.email,
            first_name=profile.first_name,
            last_name=profile.last_name,
        )

    async def remove_member(self, ctx: AuthContext, team_id: str, user_id: str) -> None:
        await self._get_team_or_404(ctx.organization_id, team_id)
        removed = await self.team_repo.remove_member(team_id, user_id)
        if not removed:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        await self.audit_repo.create(
            user_id=ctx.user_id,
            org_id=ctx.organization_id,
            action="team.member_removed",
            resource="team",
            resource_id=team_id,
            metadata={"user_id": user_id},
        )

    async def _get_team_or_404(self, org_id: str, team_id: str) -> Team:
        team = await self.team_repo.get_by_id(team_id, org_id)
        if not team:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
        return team

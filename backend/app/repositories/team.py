from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Profile, Team, TeamMember


class TeamRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_org(
        self, org_id: str, page: int = 1, page_size: int = 50
    ) -> tuple[list[Team], int]:
        count_q = select(func.count()).select_from(Team).where(Team.organization_id == org_id)
        total = (await self.db.execute(count_q)).scalar() or 0

        q = (
            select(Team)
            .where(Team.organization_id == org_id)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .order_by(Team.created_at.desc())
        )
        result = await self.db.execute(q)
        return list(result.scalars().all()), total

    async def get_by_id(self, team_id: str, org_id: str) -> Team | None:
        result = await self.db.execute(
            select(Team).where(Team.id == team_id, Team.organization_id == org_id)
        )
        return result.scalar_one_or_none()

    async def create(self, org_id: str, name: str, description: str | None = None) -> Team:
        team = Team(organization_id=org_id, name=name, description=description)
        self.db.add(team)
        await self.db.flush()
        return team

    async def update(self, team: Team, **kwargs: object) -> Team:
        for key, value in kwargs.items():
            if hasattr(team, key) and value is not None:
                setattr(team, key, value)
        await self.db.flush()
        return team

    async def delete(self, team: Team) -> None:
        await self.db.delete(team)
        await self.db.flush()

    async def add_member(self, team_id: str, user_id: str, role: str = "member") -> TeamMember:
        member = TeamMember(team_id=team_id, user_id=user_id, role=role)
        self.db.add(member)
        await self.db.flush()
        return member

    async def remove_member(self, team_id: str, user_id: str) -> bool:
        result = await self.db.execute(
            select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
        )
        member = result.scalar_one_or_none()
        if member:
            await self.db.delete(member)
            await self.db.flush()
            return True
        return False

    async def list_members(self, team_id: str) -> list[tuple[TeamMember, Profile]]:
        q = (
            select(TeamMember, Profile)
            .join(Profile, TeamMember.user_id == Profile.id)
            .where(TeamMember.team_id == team_id)
        )
        result = await self.db.execute(q)
        return [(row[0], row[1]) for row in result.all()]

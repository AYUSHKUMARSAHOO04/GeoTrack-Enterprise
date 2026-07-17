from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Profile


class ProfileRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: str) -> Profile | None:
        result = await self.db.execute(
            select(Profile).where(Profile.id == user_id, Profile.is_active.is_(True))
        )
        return result.scalar_one_or_none()

    async def update(self, profile: Profile, **kwargs: object) -> Profile:
        for key, value in kwargs.items():
            if hasattr(profile, key) and value is not None:
                setattr(profile, key, value)
        await self.db.flush()
        return profile

    async def list_by_organization(self, org_id: str) -> list[Profile]:
        result = await self.db.execute(
            select(Profile).where(Profile.organization_id == org_id, Profile.is_active.is_(True))
        )
        return list(result.scalars().all())

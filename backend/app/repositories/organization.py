from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Organization


class OrganizationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, org_id: str) -> Organization | None:
        result = await self.db.execute(
            select(Organization).where(Organization.id == org_id, Organization.is_active.is_(True))
        )
        return result.scalar_one_or_none()

    async def update(self, org: Organization, **kwargs: object) -> Organization:
        for key, value in kwargs.items():
            if hasattr(org, key) and value is not None:
                setattr(org, key, value)
        await self.db.flush()
        return org

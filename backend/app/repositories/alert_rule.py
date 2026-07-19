from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AlertRule


class AlertRuleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, **kwargs: Any) -> AlertRule:
        rule = AlertRule(**kwargs)
        self.db.add(rule)
        await self.db.flush()
        return rule

    async def get_by_id(self, rule_id: str, org_id: str) -> AlertRule | None:
        result = await self.db.execute(
            select(AlertRule).where(AlertRule.id == rule_id, AlertRule.organization_id == org_id)
        )
        return result.scalar_one_or_none()

    async def list_by_org(self, org_id: str, enabled_only: bool = False) -> list[AlertRule]:
        conditions: list[Any] = [AlertRule.organization_id == org_id]
        if enabled_only:
            conditions.append(AlertRule.is_enabled.is_(True))
        result = await self.db.execute(
            select(AlertRule).where(*conditions).order_by(AlertRule.priority.desc())
        )
        return list(result.scalars().all())

    async def update(self, rule: AlertRule, **kwargs: Any) -> AlertRule:
        for key, value in kwargs.items():
            setattr(rule, key, value)
        await self.db.flush()
        return rule

    async def delete(self, rule: AlertRule) -> None:
        await self.db.delete(rule)
        await self.db.flush()

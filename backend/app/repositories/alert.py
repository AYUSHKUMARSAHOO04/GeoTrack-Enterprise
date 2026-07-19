from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Alert


class AlertRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, **kwargs: Any) -> Alert:
        alert = Alert(**kwargs)
        self.db.add(alert)
        await self.db.flush()
        return alert

    async def get_by_id(self, alert_id: str, org_id: str) -> Alert | None:
        result = await self.db.execute(
            select(Alert).where(Alert.id == alert_id, Alert.organization_id == org_id)
        )
        return result.scalar_one_or_none()

    async def list_by_org(
        self,
        org_id: str,
        state: str | None = None,
        severity: str | None = None,
        device_id: str | None = None,
        limit: int = 100,
    ) -> list[Alert]:
        conditions: list[Any] = [Alert.organization_id == org_id]
        if state:
            conditions.append(Alert.state == state)
        if severity:
            conditions.append(Alert.severity == severity)
        if device_id:
            conditions.append(Alert.device_id == device_id)
        result = await self.db.execute(
            select(Alert).where(*conditions).order_by(Alert.triggered_at.desc()).limit(limit)
        )
        return list(result.scalars().all())

    async def count_today(self, org_id: str) -> int:
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        result = await self.db.execute(
            select(func.count())
            .select_from(Alert)
            .where(
                Alert.organization_id == org_id,
                Alert.triggered_at >= today_start,
            )
        )
        return int(result.scalar() or 0)

    async def count_by_state(self, org_id: str, state: str) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(Alert)
            .where(Alert.organization_id == org_id, Alert.state == state)
        )
        return int(result.scalar() or 0)

    async def update(self, alert: Alert, **kwargs: Any) -> Alert:
        for key, value in kwargs.items():
            setattr(alert, key, value)
        await self.db.flush()
        return alert

    async def find_recent_same_type(
        self,
        org_id: str,
        device_id: str,
        alert_type: str,
        within_minutes: int = 30,
    ) -> Alert | None:
        threshold = datetime.now().replace(minute=0, second=0, microsecond=0)
        from datetime import timedelta

        threshold = datetime.now() - timedelta(minutes=within_minutes)
        result = await self.db.execute(
            select(Alert)
            .where(
                Alert.organization_id == org_id,
                Alert.device_id == device_id,
                Alert.alert_type == alert_type,
                Alert.triggered_at >= threshold,
            )
            .order_by(Alert.triggered_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

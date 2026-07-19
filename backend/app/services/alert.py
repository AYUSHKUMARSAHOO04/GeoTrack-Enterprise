from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import AuthContext
from app.core.redis import RedisChannels, RedisService
from app.models import Notification
from app.repositories import (
    AlertRepository,
    AuditLogRepository,
    NotificationRepository,
)
from app.schemas import AlertResponse


class AlertService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.alert_repo = AlertRepository(db)
        self.audit_repo = AuditLogRepository(db)
        self.notif_repo = NotificationRepository(db)

    async def list_alerts(
        self,
        org_id: str,
        state: str | None = None,
        severity: str | None = None,
        device_id: str | None = None,
        limit: int = 100,
    ) -> list[AlertResponse]:
        alerts = await self.alert_repo.list_by_org(org_id, state, severity, device_id, limit)
        return [AlertResponse.model_validate(a) for a in alerts]

    async def acknowledge(self, ctx: AuthContext, alert_id: str) -> AlertResponse:
        alert = await self.alert_repo.get_by_id(alert_id, ctx.organization_id)
        if not alert:
            raise ValueError("Alert not found")
        alert = await self.alert_repo.update(
            alert,
            state="acknowledged",
            acknowledged_by=ctx.user_id,
            acknowledged_at=datetime.now(UTC),
        )
        await self.audit_repo.create(
            user_id=ctx.user_id,
            org_id=ctx.organization_id,
            action="alert.acknowledge",
            resource="alert",
            resource_id=alert_id,
        )
        await RedisService.publish(
            RedisChannels.ALERT_ACKNOWLEDGED,
            {
                "alert_id": alert.id,
                "organization_id": ctx.organization_id,
                "device_id": alert.device_id,
            },
        )
        return AlertResponse.model_validate(alert)

    async def resolve(self, ctx: AuthContext, alert_id: str) -> AlertResponse:
        alert = await self.alert_repo.get_by_id(alert_id, ctx.organization_id)
        if not alert:
            raise ValueError("Alert not found")
        alert = await self.alert_repo.update(
            alert,
            state="resolved",
            resolved_by=ctx.user_id,
            resolved_at=datetime.now(UTC),
        )
        await self.audit_repo.create(
            user_id=ctx.user_id,
            org_id=ctx.organization_id,
            action="alert.resolve",
            resource="alert",
            resource_id=alert_id,
        )
        await RedisService.publish(
            RedisChannels.ALERT_RESOLVED,
            {
                "alert_id": alert.id,
                "organization_id": ctx.organization_id,
                "device_id": alert.device_id,
            },
        )
        return AlertResponse.model_validate(alert)


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.notif_repo = NotificationRepository(db)

    async def list_notifications(
        self, user_id: str, unread_only: bool = False
    ) -> list[Notification]:
        return await self.notif_repo.list_by_user(user_id, unread_only)

    async def mark_read(self, notification_id: str, user_id: str) -> bool:
        return await self.notif_repo.mark_read(notification_id, user_id)

    async def mark_all_read(self, user_id: str) -> int:
        return await self.notif_repo.mark_all_read(user_id)

    async def get_unread_count(self, user_id: str) -> int:
        return await self.notif_repo.count_unread(user_id)

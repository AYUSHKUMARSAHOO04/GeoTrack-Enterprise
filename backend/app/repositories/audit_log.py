from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog


class AuditLogRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: str | None,
        org_id: str | None,
        action: str,
        resource: str,
        resource_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        ip_address: str | None = None,
    ) -> AuditLog:
        log = AuditLog(
            user_id=user_id,
            organization_id=org_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            metadata_=metadata,
            ip_address=ip_address,
        )
        self.db.add(log)
        await self.db.flush()
        return log

    async def list(
        self,
        org_id: str,
        page: int = 1,
        page_size: int = 50,
        action: str | None = None,
        resource: str | None = None,
        user_id: str | None = None,
    ) -> list[AuditLog]:
        conditions = [AuditLog.organization_id == org_id]
        if action:
            conditions.append(AuditLog.action == action)
        if resource:
            conditions.append(AuditLog.resource == resource)
        if user_id:
            conditions.append(AuditLog.user_id == user_id)

        q = (
            select(AuditLog)
            .where(*conditions)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .order_by(AuditLog.created_at.desc())
        )
        result = await self.db.execute(q)
        return list(result.scalars().all())

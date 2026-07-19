from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification


class NotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, **kwargs: Any) -> Notification:
        notif = Notification(**kwargs)
        self.db.add(notif)
        await self.db.flush()
        return notif

    async def list_by_user(
        self, user_id: str, unread_only: bool = False, limit: int = 50
    ) -> list[Notification]:
        conditions: list[Any] = [Notification.user_id == user_id]
        if unread_only:
            conditions.append(Notification.is_read.is_(False))
        result = await self.db.execute(
            select(Notification)
            .where(*conditions)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def mark_read(self, notification_id: str, user_id: str) -> bool:
        result = await self.db.execute(
            update(Notification)
            .where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
            .values(is_read=True)
        )
        await self.db.flush()
        return result.rowcount > 0

    async def mark_all_read(self, user_id: str) -> int:
        result = await self.db.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
            .values(is_read=True)
        )
        await self.db.flush()
        return result.rowcount

    async def count_unread(self, user_id: str) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
        )
        return int(result.scalar() or 0)

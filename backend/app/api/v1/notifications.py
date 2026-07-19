from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import AuthContext, get_auth_context
from app.schemas import NotificationResponse
from app.services import NotificationService

router = APIRouter()


@router.get("/notifications", response_model=list[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    ctx: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
) -> list[NotificationResponse]:
    service = NotificationService(db)
    notifs = await service.list_notifications(ctx.user_id, unread_only)
    return [NotificationResponse.model_validate(n) for n in notifs]


@router.get("/notifications/unread-count")
async def get_unread_count(
    ctx: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    service = NotificationService(db)
    count = await service.get_unread_count(ctx.user_id)
    return {"unread_count": count}


@router.post("/notifications/{notification_id}/read", status_code=204)
async def mark_notification_read(
    notification_id: str,
    ctx: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
) -> None:
    service = NotificationService(db)
    marked = await service.mark_read(notification_id, ctx.user_id)
    if not marked:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")


@router.post("/notifications/read-all", status_code=204)
async def mark_all_notifications_read(
    ctx: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
) -> None:
    service = NotificationService(db)
    await service.mark_all_read(ctx.user_id)

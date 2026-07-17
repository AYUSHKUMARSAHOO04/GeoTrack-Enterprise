from fastapi import Depends, Query
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import AuthContext, require_permission
from app.schemas import AuditLogResponse
from app.services import AuditLogService

router = APIRouter()


@router.get("/audit-logs", response_model=list[AuditLogResponse])
async def list_audit_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    action: str | None = Query(default=None),
    resource: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    ctx: AuthContext = Depends(require_permission("audit_logs:read")),
    db: AsyncSession = Depends(get_db),
) -> list[AuditLogResponse]:
    service = AuditLogService(db)
    return await service.list_logs(ctx, page, page_size, action, resource, user_id)

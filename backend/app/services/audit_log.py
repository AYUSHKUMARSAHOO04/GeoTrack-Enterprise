from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import AuthContext
from app.repositories import AuditLogRepository
from app.schemas import AuditLogResponse


class AuditLogService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.audit_repo = AuditLogRepository(db)

    async def list_logs(
        self,
        ctx: AuthContext,
        page: int = 1,
        page_size: int = 50,
        action: str | None = None,
        resource: str | None = None,
        user_id: str | None = None,
    ) -> list[AuditLogResponse]:
        logs = await self.audit_repo.list(
            ctx.organization_id, page, page_size, action, resource, user_id
        )
        return [AuditLogResponse.model_validate(log) for log in logs]

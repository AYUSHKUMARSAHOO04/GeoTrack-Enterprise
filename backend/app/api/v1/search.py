from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import AuthContext, require_permission
from app.services import SearchService

router = APIRouter()


@router.get("/search")
async def search(
    q: str = Query(min_length=1, max_length=200),
    limit: int = Query(default=20, ge=1, le=100),
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    service = SearchService(db)
    return await service.search(ctx.organization_id, q, limit)

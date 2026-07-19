from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import AuthContext, require_permission
from app.schemas import AlertResponse
from app.services import AlertService

router = APIRouter()


@router.get("/alerts", response_model=list[AlertResponse])
async def list_alerts(
    state: str | None = None,
    severity: str | None = None,
    device_id: str | None = None,
    limit: int = 100,
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> list[AlertResponse]:
    service = AlertService(db)
    return await service.list_alerts(ctx.organization_id, state, severity, device_id, limit)


@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: str,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> AlertResponse:
    service = AlertService(db)
    try:
        return await service.acknowledge(ctx, alert_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/alerts/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: str,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> AlertResponse:
    service = AlertService(db)
    try:
        return await service.resolve(ctx, alert_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

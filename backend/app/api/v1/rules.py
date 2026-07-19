from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import AuthContext, require_permission
from app.schemas import AlertRuleCreate, AlertRuleResponse, AlertRuleUpdate
from app.services import RuleEngineService

router = APIRouter()


@router.post("/rules", response_model=AlertRuleResponse, status_code=201)
async def create_rule(
    data: AlertRuleCreate,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> AlertRuleResponse:
    service = RuleEngineService(db)
    return await service.create_rule(ctx, data)


@router.get("/rules", response_model=list[AlertRuleResponse])
async def list_rules(
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> list[AlertRuleResponse]:
    service = RuleEngineService(db)
    return await service.list_rules(ctx)


@router.get("/rules/{rule_id}", response_model=AlertRuleResponse)
async def get_rule(
    rule_id: str,
    ctx: AuthContext = Depends(require_permission("devices:read")),
    db: AsyncSession = Depends(get_db),
) -> AlertRuleResponse:
    service = RuleEngineService(db)
    try:
        return await service.get_rule(ctx, rule_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/rules/{rule_id}", response_model=AlertRuleResponse)
async def update_rule(
    rule_id: str,
    data: AlertRuleUpdate,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> AlertRuleResponse:
    service = RuleEngineService(db)
    try:
        return await service.update_rule(ctx, rule_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(
    rule_id: str,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> None:
    service = RuleEngineService(db)
    try:
        await service.delete_rule(ctx, rule_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/rules/{rule_id}/enable", response_model=AlertRuleResponse)
async def enable_rule(
    rule_id: str,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> AlertRuleResponse:
    service = RuleEngineService(db)
    try:
        return await service.toggle_rule(ctx, rule_id, True)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/rules/{rule_id}/disable", response_model=AlertRuleResponse)
async def disable_rule(
    rule_id: str,
    ctx: AuthContext = Depends(require_permission("devices:update")),
    db: AsyncSession = Depends(get_db),
) -> AlertRuleResponse:
    service = RuleEngineService(db)
    try:
        return await service.toggle_rule(ctx, rule_id, False)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

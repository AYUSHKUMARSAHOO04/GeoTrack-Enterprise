from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import AuthContext
from app.repositories import AlertRuleRepository, AuditLogRepository
from app.schemas import AlertRuleCreate, AlertRuleResponse, AlertRuleUpdate


class RuleEngineService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.rule_repo = AlertRuleRepository(db)
        self.audit_repo = AuditLogRepository(db)

    async def create_rule(self, ctx: AuthContext, data: AlertRuleCreate) -> AlertRuleResponse:
        rule = await self.rule_repo.create(
            organization_id=ctx.organization_id,
            name=data.name,
            description=data.description,
            rule_type=data.rule_type,
            conditions=data.conditions,
            severity=data.severity,
            priority=data.priority,
            is_enabled=data.is_enabled,
            schedule_start=data.schedule_start,
            schedule_end=data.schedule_end,
            schedule_days=data.schedule_days,
            geofence_id=data.geofence_id,
        )
        await self.audit_repo.create(
            user_id=ctx.user_id,
            org_id=ctx.organization_id,
            action="rule.create",
            resource="alert_rule",
            resource_id=rule.id,
            metadata={"name": data.name, "rule_type": data.rule_type},
        )
        return AlertRuleResponse.model_validate(rule)

    async def list_rules(self, ctx: AuthContext) -> list[AlertRuleResponse]:
        rules = await self.rule_repo.list_by_org(ctx.organization_id)
        return [AlertRuleResponse.model_validate(r) for r in rules]

    async def get_rule(self, ctx: AuthContext, rule_id: str) -> AlertRuleResponse:
        rule = await self.rule_repo.get_by_id(rule_id, ctx.organization_id)
        if not rule:
            raise ValueError("Rule not found")
        return AlertRuleResponse.model_validate(rule)

    async def update_rule(
        self, ctx: AuthContext, rule_id: str, data: AlertRuleUpdate
    ) -> AlertRuleResponse:
        rule = await self.rule_repo.get_by_id(rule_id, ctx.organization_id)
        if not rule:
            raise ValueError("Rule not found")
        updates: dict[str, Any] = data.model_dump(exclude_unset=True)
        rule = await self.rule_repo.update(rule, **updates)
        await self.audit_repo.create(
            user_id=ctx.user_id,
            org_id=ctx.organization_id,
            action="rule.update",
            resource="alert_rule",
            resource_id=rule.id,
            metadata=updates,
        )
        return AlertRuleResponse.model_validate(rule)

    async def delete_rule(self, ctx: AuthContext, rule_id: str) -> None:
        rule = await self.rule_repo.get_by_id(rule_id, ctx.organization_id)
        if not rule:
            raise ValueError("Rule not found")
        await self.audit_repo.create(
            user_id=ctx.user_id,
            org_id=ctx.organization_id,
            action="rule.delete",
            resource="alert_rule",
            resource_id=rule.id,
        )
        await self.rule_repo.delete(rule)

    async def toggle_rule(self, ctx: AuthContext, rule_id: str, enabled: bool) -> AlertRuleResponse:
        return await self.update_rule(ctx, rule_id, AlertRuleUpdate(is_enabled=enabled))

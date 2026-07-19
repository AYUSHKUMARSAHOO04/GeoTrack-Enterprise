from collections.abc import Awaitable, Callable
from enum import StrEnum

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models import Profile


class Role(StrEnum):
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    OPERATOR = "operator"
    VIEWER = "viewer"


ROLE_HIERARCHY: dict[Role, int] = {
    Role.OWNER: 5,
    Role.ADMIN: 4,
    Role.MANAGER: 3,
    Role.OPERATOR: 2,
    Role.VIEWER: 1,
}

ROLE_PERMISSIONS: dict[Role, set[str]] = {
    Role.OWNER: {
        "organizations:read",
        "organizations:update",
        "teams:read",
        "teams:create",
        "teams:update",
        "teams:delete",
        "devices:read",
        "devices:create",
        "devices:update",
        "devices:delete",
        "audit_logs:read",
        "members:read",
        "members:manage",
        "geofences:read",
        "geofences:create",
        "geofences:update",
        "geofences:delete",
        "rules:read",
        "rules:create",
        "rules:update",
        "rules:delete",
        "alerts:read",
        "alerts:acknowledge",
        "alerts:resolve",
        "analytics:read",
        "notifications:read",
        "search:read",
    },
    Role.ADMIN: {
        "organizations:read",
        "teams:read",
        "teams:create",
        "teams:update",
        "teams:delete",
        "devices:read",
        "devices:create",
        "devices:update",
        "devices:delete",
        "audit_logs:read",
        "members:read",
        "members:manage",
        "geofences:read",
        "geofences:create",
        "geofences:update",
        "geofences:delete",
        "rules:read",
        "rules:create",
        "rules:update",
        "rules:delete",
        "alerts:read",
        "alerts:acknowledge",
        "alerts:resolve",
        "analytics:read",
        "notifications:read",
        "search:read",
    },
    Role.MANAGER: {
        "teams:read",
        "teams:create",
        "teams:update",
        "devices:read",
        "devices:create",
        "devices:update",
        "members:read",
        "geofences:read",
        "geofences:create",
        "geofences:update",
        "rules:read",
        "rules:create",
        "rules:update",
        "alerts:read",
        "alerts:acknowledge",
        "alerts:resolve",
        "analytics:read",
        "notifications:read",
        "search:read",
    },
    Role.OPERATOR: {
        "teams:read",
        "devices:read",
        "geofences:read",
        "rules:read",
        "alerts:read",
        "alerts:acknowledge",
        "analytics:read",
        "notifications:read",
        "search:read",
    },
    Role.VIEWER: {
        "teams:read",
        "devices:read",
        "geofences:read",
        "rules:read",
        "alerts:read",
        "analytics:read",
        "notifications:read",
        "search:read",
    },
}


def has_permission(role: str, permission: str) -> bool:
    try:
        r = Role(role)
    except ValueError:
        return False
    return permission in ROLE_PERMISSIONS.get(r, set())


class AuthContext:
    def __init__(self, user_id: str, profile: Profile):
        self.user_id = user_id
        self.profile = profile
        self.organization_id: str = profile.organization_id or ""
        self.role = profile.role
        self.permissions = ROLE_PERMISSIONS.get(Role(profile.role), set())


async def get_auth_context(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> AuthContext:
    result = await db.execute(
        select(Profile).where(Profile.id == user_id, Profile.is_active.is_(True))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Profile not found or inactive",
        )
    return AuthContext(user_id=user_id, profile=profile)


def require_permission(
    permission: str,
) -> Callable[..., Awaitable[AuthContext]]:
    async def dependency(ctx: AuthContext = Depends(get_auth_context)) -> AuthContext:
        if not has_permission(ctx.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: requires '{permission}'",
            )
        return ctx

    return dependency

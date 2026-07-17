"""Tests for health endpoint, auth, and RBAC."""
import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret-for-testing-only")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")

from app.main import app  # noqa: E402


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


class TestHealth:
    def test_health_check(self, client: TestClient) -> None:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "geotrack-enterprise"


class TestAuth:
    def test_missing_token_returns_401(self, client: TestClient) -> None:
        response = client.get("/api/v1/me")
        assert response.status_code == 401

    def test_invalid_token_returns_401(self, client: TestClient) -> None:
        response = client.get(
            "/api/v1/me",
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert response.status_code == 401

    def test_protected_endpoint_without_auth(self, client: TestClient) -> None:
        response = client.get("/api/v1/devices")
        assert response.status_code == 401

    def test_protected_endpoint_without_auth_teams(self, client: TestClient) -> None:
        response = client.get("/api/v1/teams")
        assert response.status_code == 401

    def test_audit_logs_without_auth(self, client: TestClient) -> None:
        response = client.get("/api/v1/audit-logs")
        assert response.status_code == 401


class TestRBAC:
    def test_permission_check_owner(self) -> None:
        from app.core.rbac import Role, has_permission

        assert has_permission(Role.OWNER, "organizations:update") is True
        assert has_permission(Role.OWNER, "devices:delete") is True

    def test_permission_check_viewer(self) -> None:
        from app.core.rbac import Role, has_permission

        assert has_permission(Role.VIEWER, "devices:read") is True
        assert has_permission(Role.VIEWER, "devices:create") is False
        assert has_permission(Role.VIEWER, "teams:delete") is False

    def test_permission_check_operator(self) -> None:
        from app.core.rbac import Role, has_permission

        assert has_permission(Role.OPERATOR, "devices:read") is True
        assert has_permission(Role.OPERATOR, "devices:create") is False

    def test_permission_check_manager(self) -> None:
        from app.core.rbac import Role, has_permission

        assert has_permission(Role.MANAGER, "devices:create") is True
        assert has_permission(Role.MANAGER, "teams:delete") is False
        assert has_permission(Role.MANAGER, "audit_logs:read") is False

    def test_permission_check_admin(self) -> None:
        from app.core.rbac import Role, has_permission

        assert has_permission(Role.ADMIN, "teams:delete") is True
        assert has_permission(Role.ADMIN, "audit_logs:read") is True
        assert has_permission(Role.ADMIN, "organizations:update") is False

    def test_invalid_role(self) -> None:
        from app.core.rbac import has_permission

        assert has_permission("invalid_role", "devices:read") is False

    def test_role_permissions_completeness(self) -> None:
        from app.core.rbac import ROLE_PERMISSIONS, Role

        for role in Role:
            assert len(ROLE_PERMISSIONS[role]) > 0, f"Role {role} has no permissions"

    def test_owner_has_all_permissions(self) -> None:
        from app.core.rbac import ROLE_PERMISSIONS, Role

        owner_perms = ROLE_PERMISSIONS[Role.OWNER]
        for role in Role:
            if role == Role.OWNER:
                continue
            assert ROLE_PERMISSIONS[role].issubset(owner_perms), (
                f"Owner missing permissions from {role}"
            )

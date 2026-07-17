"""Tests for health check, authentication (401), and RBAC permission enforcement.

All auth failures MUST return 401, never 500:
- Missing token
- Invalid token
- Expired token
- Unconfigured JWT secret
"""

from unittest.mock import AsyncMock, MagicMock

import jwt
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.core.database import get_db
from app.main import app
from app.models import Profile


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture
def make_token():
    def _make(sub: str = "user-123", secret: str | None = None) -> str:
        return jwt.encode(
            {"sub": sub, "aud": "authenticated"},
            secret or settings.SUPABASE_JWT_SECRET or "test-secret",
            algorithm="HS256",
        )

    return _make


def make_profile(profile_id: str = "user-123", role: str = "viewer") -> Profile:
    return Profile(
        id=profile_id,
        organization_id="org-123",
        email="test@example.com",
        first_name="Test",
        last_name="User",
        role=role,
        is_active=True,
    )


def override_db_with_profile(profile: Profile):
    """Override get_db so get_auth_context finds the given profile."""

    async def _get_db_override():
        mock_session = MagicMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = profile
        mock_session.execute = AsyncMock(return_value=mock_result)
        yield mock_session

    app.dependency_overrides[get_db] = _get_db_override


@pytest.fixture(autouse=True)
def reset_overrides():
    yield
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["service"] == "geotrack-enterprise"


# ---------------------------------------------------------------------------
# Authentication: all failures must return 401, never 500
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_missing_token_returns_401(client):
    response = await client.get("/api/v1/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing authentication token"


@pytest.mark.asyncio
async def test_invalid_token_returns_401(client):
    response = await client.get(
        "/api/v1/me",
        headers={"Authorization": "Bearer not-a-real-jwt"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token"


@pytest.mark.asyncio
async def test_expired_token_returns_401(client, make_token):
    token = jwt.encode(
        {"sub": "user-123", "aud": "authenticated", "exp": 1},
        "test-secret",
        algorithm="HS256",
    )
    response = await client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Token expired"


@pytest.mark.asyncio
async def test_unconfigured_jwt_secret_returns_401(client, make_token, monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "")
    token = make_token()
    response = await client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication not configured"


@pytest.mark.asyncio
async def test_token_with_missing_sub_returns_401(client):
    token = jwt.encode({"aud": "authenticated"}, "test-secret", algorithm="HS256")
    response = await client.get(
        "/api/v1/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token: missing user ID"


# ---------------------------------------------------------------------------
# RBAC: permission enforcement
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_viewer_cannot_create_teams(client, make_token):
    """VIEWER role lacks teams:create — must get 403, not 401 or 500."""
    override_db_with_profile(make_profile(role="viewer"))
    token = make_token(sub="viewer-user")
    response = await client.post(
        "/api/v1/teams",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Should Fail"},
    )
    assert response.status_code == 403
    assert response.status_code != 500


@pytest.mark.asyncio
async def test_operator_cannot_delete_teams(client, make_token):
    """OPERATOR role lacks teams:delete — must get 403, not 500."""
    override_db_with_profile(make_profile(role="operator"))
    token = make_token(sub="operator-user")
    response = await client.delete(
        "/api/v1/teams/team-abc",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.status_code != 500


@pytest.mark.asyncio
async def test_viewer_cannot_create_devices(client, make_token):
    """VIEWER role lacks devices:create — must get 403, not 500."""
    override_db_with_profile(make_profile(role="viewer"))
    token = make_token(sub="viewer-user")
    response = await client.post(
        "/api/v1/devices",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Should Fail"},
    )
    assert response.status_code == 403
    assert response.status_code != 500


@pytest.mark.asyncio
async def test_viewer_cannot_delete_devices(client, make_token):
    """VIEWER role lacks devices:delete — must get 403, not 500."""
    override_db_with_profile(make_profile(role="viewer"))
    token = make_token(sub="viewer-user")
    response = await client.delete(
        "/api/v1/devices/device-abc",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.status_code != 500


@pytest.mark.asyncio
async def test_viewer_cannot_read_audit_logs(client, make_token):
    """VIEWER role lacks audit_logs:read — must get 403, not 500."""
    override_db_with_profile(make_profile(role="viewer"))
    token = make_token(sub="viewer-user")
    response = await client.get(
        "/api/v1/audit-logs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.status_code != 500


@pytest.mark.asyncio
async def test_viewer_cannot_manage_members(client, make_token):
    """VIEWER role lacks members:manage — must get 403, not 500."""
    override_db_with_profile(make_profile(role="viewer"))
    token = make_token(sub="viewer-user")
    response = await client.post(
        "/api/v1/teams/team-abc/members",
        headers={"Authorization": f"Bearer {token}"},
        json={"user_id": "some-user", "role": "member"},
    )
    assert response.status_code == 403
    assert response.status_code != 500


@pytest.mark.asyncio
async def test_viewer_cannot_update_organization(client, make_token):
    """VIEWER role lacks organizations:update — must get 403, not 500."""
    override_db_with_profile(make_profile(role="viewer"))
    token = make_token(sub="viewer-user")
    response = await client.patch(
        "/api/v1/organizations/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Should Fail"},
    )
    assert response.status_code == 403
    assert response.status_code != 500


@pytest.mark.asyncio
async def test_no_500_errors_on_any_protected_endpoint_without_token(client):
    """Every protected endpoint must return 401 (not 500) when no token is provided."""
    endpoints = [
        ("GET", "/api/v1/me"),
        ("PATCH", "/api/v1/me"),
        ("GET", "/api/v1/organizations/me"),
        ("PATCH", "/api/v1/organizations/me"),
        ("GET", "/api/v1/organizations/me/members"),
        ("GET", "/api/v1/teams"),
        ("POST", "/api/v1/teams"),
        ("GET", "/api/v1/teams/team-1"),
        ("PATCH", "/api/v1/teams/team-1"),
        ("DELETE", "/api/v1/teams/team-1"),
        ("GET", "/api/v1/teams/team-1/members"),
        ("POST", "/api/v1/teams/team-1/members"),
        ("DELETE", "/api/v1/teams/team-1/members/user-1"),
        ("GET", "/api/v1/devices"),
        ("POST", "/api/v1/devices"),
        ("GET", "/api/v1/devices/device-1"),
        ("PATCH", "/api/v1/devices/device-1"),
        ("DELETE", "/api/v1/devices/device-1"),
        ("GET", "/api/v1/audit-logs"),
    ]
    for method, path in endpoints:
        response = await client.request(method, path)
        assert (
            response.status_code == 401
        ), f"{method} {path} returned {response.status_code}, expected 401"

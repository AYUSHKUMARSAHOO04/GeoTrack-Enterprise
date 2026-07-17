"""Pytest configuration and shared fixtures."""

import pytest

from app.core.config import settings


@pytest.fixture(autouse=True)
def configure_jwt_secret():
    """Set a test JWT secret for all tests so auth logic can actually decode tokens."""
    original = settings.SUPABASE_JWT_SECRET
    settings.SUPABASE_JWT_SECRET = "test-secret"
    yield
    settings.SUPABASE_JWT_SECRET = original

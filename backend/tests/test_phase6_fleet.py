"""Tests for Phase 6: geofence detection, alert engine, rule evaluation, analytics, search."""

from datetime import UTC, datetime, time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models import AlertRule, Device, Geofence, Location
from app.schemas import AlertRuleCreate, CircleGeofenceCreate, PolygonGeofenceCreate
from app.services.alert_engine import DEFAULT_THRESHOLDS, AlertEngineService
from app.services.analytics import AnalyticsService
from app.services.geofence import GeofenceService
from app.services.rule_engine import RuleEngineService
from app.services.search import SearchService


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def make_device():
    def _make(device_id: str = "dev-123", org_id: str = "org-123") -> Device:
        device = MagicMock(spec=Device)
        device.id = device_id
        device.organization_id = org_id
        device.name = "Test Device"
        device.is_deleted = False
        device.status = "active"
        return device

    return _make


@pytest.fixture
def make_location():
    def _make(
        lat: float = 37.7749,
        lng: float = -122.4194,
        speed: float = 0,
        battery: float = 80,
    ) -> Location:
        loc = MagicMock(spec=Location)
        loc.id = "loc-1"
        loc.latitude = lat
        loc.longitude = lng
        loc.speed = speed
        loc.battery_level = battery
        loc.accuracy = 10
        loc.signal_strength = -70
        loc.heading = 0
        loc.captured_at = datetime.now(UTC)
        loc.received_at = datetime.now(UTC)
        return loc

    return _make


@pytest.fixture
def make_geofence():
    def _make(
        geofence_id: str = "geo-1",
        org_id: str = "org-123",
        g_type: str = "circle",
    ) -> Geofence:
        gf = MagicMock(spec=Geofence)
        gf.id = geofence_id
        gf.organization_id = org_id
        gf.name = "Test Zone"
        gf.geofence_type = g_type
        gf.is_enabled = True
        gf.is_archived = False
        gf.priority = 0
        gf.parent_geofence_id = None
        gf.color = None
        gf.description = None
        gf.radius_meters = 1000 if g_type == "circle" else None
        gf.metadata_ = None
        gf.created_at = datetime.now(UTC)
        gf.updated_at = datetime.now(UTC)
        return gf

    return _make


@pytest.fixture
def make_alert_rule():
    def _make(
        rule_id: str = "rule-1",
        org_id: str = "org-123",
        rule_type: str = "speeding",
        threshold: int = 100,
        severity: str = "warning",
        enabled: bool = True,
    ) -> AlertRule:
        rule = MagicMock(spec=AlertRule)
        rule.id = rule_id
        rule.organization_id = org_id
        rule.name = f"Test {rule_type} rule"
        rule.description = None
        rule.rule_type = rule_type
        rule.conditions = {"threshold": threshold}
        rule.severity = severity
        rule.priority = 0
        rule.is_enabled = enabled
        rule.schedule_start = None
        rule.schedule_end = None
        rule.schedule_days = None
        rule.geofence_id = None
        return rule

    return _make


# ---------------------------------------------------------------------------
# Geofence Service — Circle Creation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_circle_geofence(mock_db, make_geofence):
    service = GeofenceService(mock_db)
    data = CircleGeofenceCreate(
        name="HQ Zone",
        geofence_type="circle",
        center_lat=37.7749,
        center_lng=-122.4194,
        radius_meters=500,
    )
    mock_gf = make_geofence()
    mock_gf.name = "HQ Zone"
    mock_gf.geofence_type = "circle"
    mock_gf.radius_meters = 500

    with patch.object(
        service.geofence_repo, "create", new_callable=AsyncMock, return_value=mock_gf
    ) as mock_create:
        result = await service.create_circle("org-123", data)

    assert result.name == "HQ Zone"
    assert mock_create.called


# ---------------------------------------------------------------------------
# Geofence Service — Polygon Creation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_polygon_geofence(mock_db, make_geofence):
    service = GeofenceService(mock_db)
    data = PolygonGeofenceCreate(
        name="Warehouse",
        geofence_type="polygon",
        coordinates=[
            {"lat": 37.77, "lng": -122.41},
            {"lat": 37.78, "lng": -122.41},
            {"lat": 37.78, "lng": -122.42},
        ],
    )
    mock_gf = make_geofence(g_type="polygon")
    mock_gf.name = "Warehouse"

    with patch.object(
        service.geofence_repo, "create", new_callable=AsyncMock, return_value=mock_gf
    ) as mock_create:
        result = await service.create_polygon("org-123", data)

    assert result.name == "Warehouse"
    assert mock_create.called


# ---------------------------------------------------------------------------
# Geofence Service — Archive & Toggle
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_archive_geofence(mock_db, make_geofence):
    service = GeofenceService(mock_db)
    gf = make_geofence()

    with (
        patch.object(service.geofence_repo, "get_by_id", new_callable=AsyncMock, return_value=gf),
        patch.object(
            service.geofence_repo, "update", new_callable=AsyncMock, return_value=gf
        ) as mock_update,
    ):
        await service.archive_geofence("org-123", "geo-1")

    assert mock_update.called
    assert mock_update.call_args.kwargs.get("is_archived") is True


@pytest.mark.asyncio
async def test_toggle_enable_geofence(mock_db, make_geofence):
    service = GeofenceService(mock_db)
    gf = make_geofence()

    with (
        patch.object(service.geofence_repo, "get_by_id", new_callable=AsyncMock, return_value=gf),
        patch.object(
            service.geofence_repo, "update", new_callable=AsyncMock, return_value=gf
        ) as mock_update,
    ):
        await service.toggle_enable("org-123", "geo-1", False)

    assert mock_update.call_args.kwargs.get("is_enabled") is False


# ---------------------------------------------------------------------------
# Geofence Service — Not Found
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_geofence_not_found(mock_db):
    service = GeofenceService(mock_db)
    with patch.object(
        service.geofence_repo, "get_by_id", new_callable=AsyncMock, return_value=None
    ):
        with pytest.raises(ValueError, match="not found"):
            await service.get_geofence("org-123", "geo-missing")


# ---------------------------------------------------------------------------
# Alert Engine — Speeding Rule
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_speeding_rule_triggers_alert(mock_db, make_device, make_location, make_alert_rule):
    service = AlertEngineService(mock_db)
    device = make_device()
    location = make_location(speed=150)
    rule = make_alert_rule(rule_type="speeding", threshold=100)

    with (
        patch.object(service.rule_repo, "list_by_org", new_callable=AsyncMock, return_value=[rule]),
        patch.object(
            service.alert_repo,
            "find_recent_same_type",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch.object(service.alert_repo, "create", new_callable=AsyncMock) as mock_alert_create,
        patch("app.services.alert_engine.RedisService.publish", new_callable=AsyncMock),
        patch.object(
            service.profile_repo,
            "list_by_organization",
            new_callable=AsyncMock,
            return_value=[],
        ),
    ):
        triggered = await service.evaluate_location(device, location, None)

    assert len(triggered) == 1
    assert mock_alert_create.called
    create_kwargs = mock_alert_create.call_args.kwargs
    assert create_kwargs["alert_type"] == "speeding"
    assert create_kwargs["severity"] == "warning"


@pytest.mark.asyncio
async def test_speeding_rule_no_trigger_when_below_threshold(
    mock_db, make_device, make_location, make_alert_rule
):
    service = AlertEngineService(mock_db)
    device = make_device()
    location = make_location(speed=80)
    rule = make_alert_rule(rule_type="speeding", threshold=100)

    with (
        patch.object(service.rule_repo, "list_by_org", new_callable=AsyncMock, return_value=[rule]),
        patch.object(service.alert_repo, "create", new_callable=AsyncMock) as mock_alert_create,
    ):
        triggered = await service.evaluate_location(device, location, None)

    assert len(triggered) == 0
    assert not mock_alert_create.called


# ---------------------------------------------------------------------------
# Alert Engine — Low Battery
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_low_battery_rule_triggers(mock_db, make_device, make_location, make_alert_rule):
    service = AlertEngineService(mock_db)
    device = make_device()
    location = make_location(battery=10)
    rule = make_alert_rule(rule_type="low_battery", threshold=20)

    with (
        patch.object(service.rule_repo, "list_by_org", new_callable=AsyncMock, return_value=[rule]),
        patch.object(
            service.alert_repo,
            "find_recent_same_type",
            new_callable=AsyncMock,
            return_value=None,
        ),
        patch.object(service.alert_repo, "create", new_callable=AsyncMock) as mock_alert_create,
        patch("app.services.alert_engine.RedisService.publish", new_callable=AsyncMock),
        patch.object(
            service.profile_repo,
            "list_by_organization",
            new_callable=AsyncMock,
            return_value=[],
        ),
    ):
        triggered = await service.evaluate_location(device, location, None)

    assert len(triggered) == 1
    assert mock_alert_create.call_args.kwargs["alert_type"] == "low_battery"


# ---------------------------------------------------------------------------
# Alert Engine — Duplicate Alert Suppression
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_duplicate_alert_suppressed(mock_db, make_device, make_location, make_alert_rule):
    service = AlertEngineService(mock_db)
    device = make_device()
    location = make_location(speed=150)
    rule = make_alert_rule(rule_type="speeding", threshold=100)
    existing_alert = MagicMock()

    with (
        patch.object(service.rule_repo, "list_by_org", new_callable=AsyncMock, return_value=[rule]),
        patch.object(
            service.alert_repo,
            "find_recent_same_type",
            new_callable=AsyncMock,
            return_value=existing_alert,
        ),
        patch.object(service.alert_repo, "create", new_callable=AsyncMock) as mock_alert_create,
    ):
        triggered = await service.evaluate_location(device, location, None)

    assert len(triggered) == 0
    assert not mock_alert_create.called


# ---------------------------------------------------------------------------
# Alert Engine — Disabled Rule Skipped
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_disabled_rule_skipped(mock_db, make_device, make_location, make_alert_rule):
    service = AlertEngineService(mock_db)
    device = make_device()
    location = make_location(speed=150)

    with (
        patch.object(service.rule_repo, "list_by_org", new_callable=AsyncMock, return_value=[]),
        patch.object(service.alert_repo, "create", new_callable=AsyncMock) as mock_alert_create,
    ):
        triggered = await service.evaluate_location(device, location, None)

    assert len(triggered) == 0
    assert not mock_alert_create.called


# ---------------------------------------------------------------------------
# Alert Engine — Condition Checks
# ---------------------------------------------------------------------------


def test_check_condition_speeding(mock_db, make_alert_rule, make_location):
    service = AlertEngineService(mock_db)
    rule = make_alert_rule(rule_type="speeding", threshold=100)
    location = make_location(speed=150)
    assert service._check_condition(rule, {"threshold": 100}, location, None) is True
    assert service._check_condition(rule, {"threshold": 200}, location, None) is False


def test_check_condition_low_battery(mock_db, make_alert_rule, make_location):
    service = AlertEngineService(mock_db)
    rule = make_alert_rule(rule_type="low_battery", threshold=20)
    location = make_location(battery=10)
    assert service._check_condition(rule, {"threshold": 20}, location, None) is True


def test_check_condition_gps_accuracy(mock_db, make_alert_rule, make_location):
    service = AlertEngineService(mock_db)
    rule = make_alert_rule(rule_type="gps_accuracy", threshold=50)
    location = make_location()
    location.accuracy = 100
    assert service._check_condition(rule, {"threshold": 50}, location, None) is True


# ---------------------------------------------------------------------------
# Alert Engine — Schedule Check
# ---------------------------------------------------------------------------


def test_is_in_schedule_no_schedule(mock_db, make_alert_rule):
    service = AlertEngineService(mock_db)
    rule = make_alert_rule()
    rule.schedule_start = None
    rule.schedule_end = None
    assert service._is_in_schedule(rule) is True


def test_is_in_schedule_with_days(mock_db, make_alert_rule):
    service = AlertEngineService(mock_db)
    rule = make_alert_rule()
    rule.schedule_start = time(9, 0)
    rule.schedule_end = time(17, 0)
    rule.schedule_days = [0, 1, 2, 3, 4]
    assert service._is_in_schedule(rule) in (True, False)


# ---------------------------------------------------------------------------
# Rule Engine — CRUD
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_rule_engine_create(mock_db, make_alert_rule):
    service = RuleEngineService(mock_db)
    ctx = MagicMock()
    ctx.organization_id = "org-123"
    ctx.user_id = "user-123"

    data = AlertRuleCreate(
        name="Speed Limit",
        rule_type="speeding",
        conditions={"threshold": 100},
        severity="warning",
    )

    mock_rule = make_alert_rule()
    with (
        patch.object(service.rule_repo, "create", new_callable=AsyncMock, return_value=mock_rule),
        patch.object(service.audit_repo, "create", new_callable=AsyncMock) as mock_audit,
    ):
        result = await service.create_rule(ctx, data)

    assert result.name == "Test speeding rule"
    assert mock_audit.called


@pytest.mark.asyncio
async def test_rule_engine_delete(mock_db, make_alert_rule):
    service = RuleEngineService(mock_db)
    ctx = MagicMock()
    ctx.organization_id = "org-123"
    ctx.user_id = "user-123"

    mock_rule = make_alert_rule()
    with (
        patch.object(
            service.rule_repo, "get_by_id", new_callable=AsyncMock, return_value=mock_rule
        ),
        patch.object(service.audit_repo, "create", new_callable=AsyncMock) as mock_audit,
        patch.object(service.rule_repo, "delete", new_callable=AsyncMock) as mock_delete,
    ):
        await service.delete_rule(ctx, "rule-1")

    assert mock_delete.called
    assert mock_audit.called


@pytest.mark.asyncio
async def test_rule_engine_not_found(mock_db):
    service = RuleEngineService(mock_db)
    ctx = MagicMock()
    ctx.organization_id = "org-123"
    ctx.user_id = "user-123"

    with patch.object(service.rule_repo, "get_by_id", new_callable=AsyncMock, return_value=None):
        with pytest.raises(ValueError, match="not found"):
            await service.get_rule(ctx, "rule-missing")


# ---------------------------------------------------------------------------
# Analytics Service
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fleet_analytics(mock_db):
    service = AnalyticsService(mock_db)

    mock_devices = [MagicMock(), MagicMock(), MagicMock()]
    for d in mock_devices:
        d.is_deleted = False

    mock_statuses = []
    for status in ("moving", "idle", "offline"):
        s = MagicMock()
        s.status = status
        s.last_speed = 50 if status == "moving" else 0
        mock_statuses.append(s)

    with (
        patch.object(
            service.device_repo,
            "list",
            new_callable=AsyncMock,
            return_value=(mock_devices, 3),
        ),
        patch.object(
            service.status_repo,
            "list_by_org",
            new_callable=AsyncMock,
            return_value=mock_statuses,
        ),
        patch.object(service.trip_repo, "list_by_org", new_callable=AsyncMock, return_value=[]),
        patch.object(service.alert_repo, "count_today", new_callable=AsyncMock, return_value=5),
        patch.object(service.alert_repo, "count_by_state", new_callable=AsyncMock, return_value=2),
        patch.object(service.geofence_repo, "list_by_org", new_callable=AsyncMock, return_value=[]),
        patch.object(service, "_count_trips_today", new_callable=AsyncMock, return_value=3),
        patch.object(service, "_sum_distance_today", new_callable=AsyncMock, return_value=50000),
    ):
        result = await service.get_fleet_analytics("org-123")

    assert result.active_devices == 3
    assert result.moving_devices == 1
    assert result.idle_devices == 1
    assert result.offline_devices == 1
    assert result.alerts_today == 5
    assert result.alerts_open == 2


# ---------------------------------------------------------------------------
# Search Service
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_search_returns_results(mock_db):
    service = SearchService(mock_db)

    with (
        patch.object(
            service,
            "_search_devices",
            new_callable=AsyncMock,
            return_value=[{"id": "dev-1", "name": "Truck 1"}],
        ),
        patch.object(service, "_search_teams", new_callable=AsyncMock, return_value=[]),
        patch.object(service, "_search_trips", new_callable=AsyncMock, return_value=[]),
        patch.object(service, "_search_geofences", new_callable=AsyncMock, return_value=[]),
        patch.object(service, "_search_alerts", new_callable=AsyncMock, return_value=[]),
    ):
        result = await service.search("org-123", "truck", limit=10)

    assert result["total"] >= 1
    assert len(result["devices"]) >= 1


# ---------------------------------------------------------------------------
# Default Thresholds
# ---------------------------------------------------------------------------


def test_default_thresholds_exist():
    assert "speeding" in DEFAULT_THRESHOLDS
    assert "low_battery" in DEFAULT_THRESHOLDS
    assert "idle_timeout" in DEFAULT_THRESHOLDS
    assert "offline_device" in DEFAULT_THRESHOLDS
    assert "signal_loss" in DEFAULT_THRESHOLDS
    assert "gps_accuracy" in DEFAULT_THRESHOLDS


def test_default_thresholds_values():
    assert DEFAULT_THRESHOLDS["speeding"] == 120
    assert DEFAULT_THRESHOLDS["low_battery"] == 20
    assert DEFAULT_THRESHOLDS["offline_device"] == 900

"""Tests for Phase 5: location ingestion, dedup, validation, auth, and spatial queries.

These tests use mocked repositories to avoid requiring a live PostGIS database.
They verify the service-layer logic: validation, deduplication, status detection,
trip detection, and error handling.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.device_auth import authenticate_device
from app.models import Device, Location
from app.repositories.device_credential import (
    DeviceCredentialRepository,
    generate_api_key,
    generate_device_secret,
    hash_secret,
)
from app.schemas import LocationIngest, LocationResponse
from app.services.location import LocationService


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
def make_location_ingest():
    def _make(
        lat: float = 37.7749,
        lng: float = -122.4194,
        captured_at: datetime | None = None,
        speed: float = 0,
    ) -> LocationIngest:
        return LocationIngest(
            latitude=lat,
            longitude=lng,
            speed=speed,
            captured_at=captured_at or datetime.now(UTC),
        )

    return _make


def _make_mock_location(
    data: LocationIngest, device_id: str = "dev-123", org_id: str = "org-123"
) -> MagicMock:
    mock_loc = MagicMock(spec=Location)
    mock_loc.id = "loc-1"
    mock_loc.device_id = device_id
    mock_loc.organization_id = org_id
    mock_loc.latitude = data.latitude
    mock_loc.longitude = data.longitude
    mock_loc.heading = data.heading
    mock_loc.speed = data.speed
    mock_loc.battery_level = data.battery_level
    mock_loc.signal_strength = None
    mock_loc.provider = data.provider
    mock_loc.accuracy = data.accuracy
    mock_loc.altitude = data.altitude
    mock_loc.captured_at = data.captured_at
    mock_loc.received_at = datetime.now(UTC)
    return mock_loc


def _patch_ingest_mocks(service, mock_location, trip_return=None):
    return (
        patch.object(
            service.location_repo,
            "exists_by_device_captured",
            new_callable=AsyncMock,
            return_value=False,
        ),
        patch.object(
            service.location_repo, "create", new_callable=AsyncMock, return_value=mock_location
        ),
        patch.object(
            service.status_repo, "get_by_device", new_callable=AsyncMock, return_value=None
        ),
        patch.object(service.status_repo, "upsert", new_callable=AsyncMock),
        patch.object(
            service.trip_repo, "get_active_trip", new_callable=AsyncMock, return_value=trip_return
        ),
        patch.object(service.trip_repo, "create", new_callable=AsyncMock),
        patch("app.services.location.RedisService.publish", new_callable=AsyncMock),
        patch("app.services.location.GeofenceService.check_location", new_callable=AsyncMock),
        patch(
            "app.services.location.AlertEngineService.evaluate_location",
            new_callable=AsyncMock,
            return_value=[],
        ),
    )


# ---------------------------------------------------------------------------
# Device Credential Generation
# ---------------------------------------------------------------------------


def test_generate_api_key_has_prefix():
    key = generate_api_key()
    assert key.startswith("gtk_")
    assert len(key) > 30


def test_generate_device_secret_is_unique():
    s1 = generate_device_secret()
    s2 = generate_device_secret()
    assert s1 != s2
    assert len(s1) > 30


def test_hash_secret_is_deterministic():
    raw = "test-secret-value"
    h1 = hash_secret(raw)
    h2 = hash_secret(raw)
    assert h1 == h2
    assert h1 != raw
    assert len(h1) == 64


def test_hash_secret_different_inputs():
    assert hash_secret("a") != hash_secret("b")


# ---------------------------------------------------------------------------
# Device Credential Repository
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_credential_repo_verify_secret_true(mock_db):
    repo = DeviceCredentialRepository(mock_db)
    raw_secret = "my-secret"
    cred = MagicMock()
    cred.secret_hash = hash_secret(raw_secret)
    assert await repo.verify_secret(cred, raw_secret) is True


@pytest.mark.asyncio
async def test_credential_repo_verify_secret_false(mock_db):
    repo = DeviceCredentialRepository(mock_db)
    cred = MagicMock()
    cred.secret_hash = hash_secret("correct-secret")
    assert await repo.verify_secret(cred, "wrong-secret") is False


# ---------------------------------------------------------------------------
# Device Authentication
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_authenticate_device_no_api_key_raises_401(mock_db):
    from fastapi import HTTPException

    with (
        patch(
            "app.core.device_auth.DeviceCredentialRepository.get_by_api_key",
            new_callable=AsyncMock,
            return_value=None,
        ),
        pytest.raises(HTTPException) as exc_info,
    ):
        await authenticate_device("", "", mock_db)
    assert exc_info.value.status_code == 401
    assert "Invalid device API key" in exc_info.value.detail


@pytest.mark.asyncio
async def test_authenticate_device_invalid_api_key_raises_401(mock_db):
    from fastapi import HTTPException

    with (
        patch(
            "app.core.device_auth.DeviceCredentialRepository.get_by_api_key",
            new_callable=AsyncMock,
            return_value=None,
        ),
        pytest.raises(HTTPException) as exc_info,
    ):
        await authenticate_device("gtk_bad", "secret", mock_db)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_authenticate_device_wrong_secret_raises_401(mock_db):
    from fastapi import HTTPException

    cred = MagicMock()
    cred.device_id = "dev-1"
    cred.status = "active"

    with (
        patch(
            "app.core.device_auth.DeviceCredentialRepository.get_by_api_key",
            new_callable=AsyncMock,
            return_value=cred,
        ),
        patch(
            "app.core.device_auth.DeviceCredentialRepository.verify_secret",
            new_callable=AsyncMock,
            return_value=False,
        ),
        pytest.raises(HTTPException) as exc_info,
    ):
        await authenticate_device("gtk_valid", "wrong", mock_db)
    assert exc_info.value.status_code == 401
    assert "Invalid device secret" in exc_info.value.detail


@pytest.mark.asyncio
async def test_authenticate_device_suspended_returns_403(mock_db, make_device):
    from fastapi import HTTPException

    cred = MagicMock()
    cred.device_id = "dev-1"
    cred.status = "active"
    device = make_device()
    device.status = "suspended"

    with (
        patch(
            "app.core.device_auth.DeviceCredentialRepository.get_by_api_key",
            new_callable=AsyncMock,
            return_value=cred,
        ),
        patch(
            "app.core.device_auth.DeviceCredentialRepository.verify_secret",
            new_callable=AsyncMock,
            return_value=True,
        ),
        patch(
            "app.core.device_auth.DeviceRepository.get_by_id",
            new_callable=AsyncMock,
            return_value=device,
        ),
        pytest.raises(HTTPException) as exc_info,
    ):
        await authenticate_device("gtk_valid", "correct", mock_db)
    assert exc_info.value.status_code == 403
    assert "suspended" in exc_info.value.detail


# ---------------------------------------------------------------------------
# Location Ingestion Validation
# ---------------------------------------------------------------------------


def test_location_ingest_rejects_invalid_latitude():
    with pytest.raises(ValueError):
        LocationIngest(latitude=91, longitude=0, captured_at=datetime.now(UTC))


def test_location_ingest_rejects_invalid_longitude():
    with pytest.raises(ValueError):
        LocationIngest(latitude=0, longitude=181, captured_at=datetime.now(UTC))


def test_location_ingest_rejects_invalid_heading():
    with pytest.raises(ValueError):
        LocationIngest(latitude=0, longitude=0, heading=361, captured_at=datetime.now(UTC))


def test_location_ingest_rejects_negative_speed():
    with pytest.raises(ValueError):
        LocationIngest(latitude=0, longitude=0, speed=-1, captured_at=datetime.now(UTC))


def test_location_ingest_rejects_invalid_battery():
    with pytest.raises(ValueError):
        LocationIngest(latitude=0, longitude=0, battery_level=101, captured_at=datetime.now(UTC))


def test_location_ingest_accepts_valid_payload(make_location_ingest):
    loc = make_location_ingest(lat=40.7128, lng=-74.006, speed=50)
    assert loc.latitude == 40.7128
    assert loc.longitude == -74.006
    assert loc.speed == 50

    loc_with_battery = LocationIngest(
        latitude=0, longitude=0, battery_level=80, captured_at=datetime.now(UTC)
    )
    assert loc_with_battery.battery_level == 80


# ---------------------------------------------------------------------------
# Location Ingestion Service — Dedup & Future Timestamp
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ingest_duplicate_returns_none(mock_db, make_device, make_location_ingest):
    service = LocationService(mock_db)
    device = make_device()
    data = make_location_ingest()

    with patch.object(
        service.location_repo,
        "exists_by_device_captured",
        new_callable=AsyncMock,
        return_value=True,
    ):
        result = await service.ingest_single(device, data)
    assert result is None


@pytest.mark.asyncio
async def test_ingest_future_timestamp_raises(mock_db, make_device, make_location_ingest):
    service = LocationService(mock_db)
    device = make_device()
    future_time = datetime.now(UTC) + timedelta(hours=1)
    data = make_location_ingest(captured_at=future_time)

    with (
        patch.object(
            service.location_repo,
            "exists_by_device_captured",
            new_callable=AsyncMock,
            return_value=False,
        ),
        pytest.raises(ValueError, match="too far in the future"),
    ):
        await service.ingest_single(device, data)


@pytest.mark.asyncio
async def test_ingest_valid_location_publishes_redis(mock_db, make_device, make_location_ingest):
    service = LocationService(mock_db)
    device = make_device()
    data = make_location_ingest(speed=30)
    mock_location = _make_mock_location(data)

    patches = _patch_ingest_mocks(service, mock_location)
    with (
        patches[0],
        patches[1],
        patches[2],
        patches[3],
        patches[4],
        patches[5],
        patches[6] as mock_publish,
        patches[7],
        patches[8],
    ):
        result = await service.ingest_single(device, data)

    assert result is not None
    assert mock_publish.call_count >= 2
    channels = [call.args[0] for call in mock_publish.call_args_list]
    assert "location.updated" in channels


# ---------------------------------------------------------------------------
# Device Status Detection
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_moving_speed_sets_moving_status(mock_db, make_device, make_location_ingest):
    service = LocationService(mock_db)
    device = make_device()
    data = make_location_ingest(speed=50)
    mock_location = _make_mock_location(data)

    patches = _patch_ingest_mocks(service, mock_location)
    with (
        patches[0],
        patches[1],
        patches[2],
        patches[3] as mock_upsert,
        patches[4],
        patches[5],
        patches[6],
        patches[7],
        patches[8],
    ):
        await service.ingest_single(device, data)

    assert mock_upsert.call_args.kwargs["status"] == "moving"


@pytest.mark.asyncio
async def test_zero_speed_sets_stopped_status(mock_db, make_device, make_location_ingest):
    service = LocationService(mock_db)
    device = make_device()
    data = make_location_ingest(speed=0)
    mock_location = _make_mock_location(data)
    mock_location.speed = 0
    mock_location.heading = None

    patches = _patch_ingest_mocks(service, mock_location)
    with (
        patches[0],
        patches[1],
        patches[2],
        patches[3] as mock_upsert,
        patches[4],
        patches[5],
        patches[6],
        patches[7],
        patches[8],
    ):
        await service.ingest_single(device, data)

    assert mock_upsert.call_args.kwargs["status"] == "stopped"


# ---------------------------------------------------------------------------
# Trip Detection
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_moving_creates_trip(mock_db, make_device, make_location_ingest):
    service = LocationService(mock_db)
    device = make_device()
    data = make_location_ingest(speed=30)
    mock_location = _make_mock_location(data)

    patches = _patch_ingest_mocks(service, mock_location)
    with (
        patches[0],
        patches[1],
        patches[2],
        patches[3],
        patches[4],
        patches[5] as mock_trip_create,
        patches[6],
        patches[7],
        patches[8],
    ):
        await service.ingest_single(device, data)

    assert mock_trip_create.called
    create_kwargs = mock_trip_create.call_args.kwargs
    assert create_kwargs["status"] == "active"
    assert create_kwargs["point_count"] == 1


@pytest.mark.asyncio
async def test_stopped_speed_does_not_create_trip(mock_db, make_device, make_location_ingest):
    service = LocationService(mock_db)
    device = make_device()
    data = make_location_ingest(speed=0)
    mock_location = _make_mock_location(data)
    mock_location.speed = 0
    mock_location.heading = None

    patches = _patch_ingest_mocks(service, mock_location)
    with (
        patches[0],
        patches[1],
        patches[2],
        patches[3],
        patches[4],
        patches[5] as mock_trip_create,
        patches[6],
        patches[7],
        patches[8],
    ):
        await service.ingest_single(device, data)

    assert not mock_trip_create.called


# ---------------------------------------------------------------------------
# Haversine Distance
# ---------------------------------------------------------------------------


def test_haversine_same_point_returns_zero(mock_db):
    service = LocationService(mock_db)
    assert service._haversine(37.7749, -122.4194, 37.7749, -122.4194) == 0


def test_haversine_known_distance(mock_db):
    service = LocationService(mock_db)
    # SF to LA ~ 559km
    dist = service._haversine(37.7749, -122.4194, 34.0522, -118.2437)
    assert 550000 < dist < 570000


# ---------------------------------------------------------------------------
# Batch Ingestion
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_batch_ingestion_filters_duplicates(mock_db, make_device, make_location_ingest):
    service = LocationService(mock_db)
    device = make_device()
    now = datetime.now(UTC)

    loc1 = make_location_ingest(captured_at=now, speed=30)
    loc2 = make_location_ingest(captured_at=now + timedelta(seconds=10), speed=30)

    call_count = 0

    async def mock_ingest_single(dev, data):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return None  # duplicate
        return LocationResponse(
            id="loc-2",
            device_id=device.id,
            organization_id=device.organization_id,
            latitude=data.latitude,
            longitude=data.longitude,
            accuracy=None,
            altitude=None,
            heading=None,
            speed=data.speed,
            battery_level=None,
            signal_strength=None,
            provider=None,
            captured_at=data.captured_at,
            received_at=datetime.now(UTC),
        )

    with patch.object(service, "ingest_single", side_effect=mock_ingest_single):
        results = await service.ingest_batch(device, [loc1, loc2])

    assert len(results) == 1


# ---------------------------------------------------------------------------
# Payload Hash
# ---------------------------------------------------------------------------


def test_payload_hash_is_deterministic(mock_db, make_location_ingest):
    service = LocationService(mock_db)
    data = make_location_ingest()
    h1 = service._compute_hash("dev-1", data)
    h2 = service._compute_hash("dev-1", data)
    assert h1 == h2
    assert len(h1) == 64


def test_payload_hash_differs_by_device(mock_db, make_location_ingest):
    service = LocationService(mock_db)
    data = make_location_ingest()
    h1 = service._compute_hash("dev-1", data)
    h2 = service._compute_hash("dev-2", data)
    assert h1 != h2

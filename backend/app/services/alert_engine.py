from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import RedisChannels, RedisService
from app.models import AlertRule, Device, DeviceStatus, Location
from app.repositories import (
    AlertRepository,
    AlertRuleRepository,
    NotificationRepository,
    ProfileRepository,
)

DEFAULT_THRESHOLDS = {
    "speeding": 120,
    "idle_timeout": 1800,
    "offline_device": 900,
    "low_battery": 20,
    "signal_loss": -100,
    "gps_accuracy": 100,
}


class AlertEngineService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.alert_repo = AlertRepository(db)
        self.rule_repo = AlertRuleRepository(db)
        self.notif_repo = NotificationRepository(db)
        self.profile_repo = ProfileRepository(db)

    async def evaluate_location(
        self, device: Device, location: Location, status: DeviceStatus | None
    ) -> list[Any]:
        rules = await self.rule_repo.list_by_org(device.organization_id, enabled_only=True)
        triggered: list[Any] = []

        for rule in rules:
            if not self._is_in_schedule(rule):
                continue
            if await self._evaluate_rule(rule, device, location, status):
                alert = await self._create_alert(rule, device, location)
                if alert:
                    triggered.append(alert)

        return triggered

    async def evaluate_offline_devices(self, org_id: str) -> list[Any]:
        from app.repositories import DeviceStatusRepository

        status_repo = DeviceStatusRepository(self.db)
        threshold = datetime.now(UTC) - timedelta(minutes=15)
        offline_devices = await status_repo.list_offline_since(org_id, threshold)

        rules = await self.rule_repo.list_by_org(org_id, enabled_only=True)
        offline_rules = [r for r in rules if r.rule_type == "offline_device"]

        triggered: list[Any] = []
        for rule in offline_rules:
            for ds in offline_devices:
                alert = await self._create_alert_for_offline(rule, ds)
                if alert:
                    triggered.append(alert)
        return triggered

    def _is_in_schedule(self, rule: AlertRule) -> bool:
        if not rule.schedule_start or not rule.schedule_end:
            return True
        now = datetime.now(UTC)
        current_time = now.time()
        if rule.schedule_days and now.weekday() not in rule.schedule_days:
            return False
        start = rule.schedule_start
        end = rule.schedule_end
        if start <= end:
            return start <= current_time <= end
        return current_time >= start or current_time <= end

    async def _evaluate_rule(
        self,
        rule: AlertRule,
        device: Device,
        location: Location,
        status: DeviceStatus | None,
    ) -> bool:
        conditions = rule.conditions or {}
        operator = conditions.get("operator", "AND")
        checks = conditions.get("checks", [])
        if not checks and "threshold" in conditions:
            checks = [conditions]

        results: list[bool] = []
        for check in checks:
            results.append(self._check_condition(rule, check, location, status))

        if operator == "OR":
            return any(results)
        return all(results)

    def _check_condition(
        self,
        rule: AlertRule,
        check: dict[str, Any],
        location: Location,
        status: DeviceStatus | None,
    ) -> bool:
        rule_type = rule.rule_type
        threshold = check.get("threshold", DEFAULT_THRESHOLDS.get(rule_type, 0))

        if rule_type == "speeding":
            return bool((location.speed or 0) > threshold)
        elif rule_type == "low_battery":
            return bool((location.battery_level or 100) < threshold)
        elif rule_type == "signal_loss":
            return bool((location.signal_strength or 0) < threshold)
        elif rule_type == "gps_accuracy":
            return bool((location.accuracy or 0) > threshold)
        elif rule_type == "idle_timeout":
            if status and status.last_received_at:
                idle_time = (datetime.now(UTC) - status.last_received_at).total_seconds()
                return bool(idle_time > threshold)
            return False
        elif rule_type == "unauthorized_movement":
            return bool((location.speed or 0) > threshold and (location.heading or 0) > 0)
        return False

    async def _create_alert(self, rule: AlertRule, device: Device, location: Location) -> Any:
        existing = await self.alert_repo.find_recent_same_type(
            device.organization_id, device.id, rule.rule_type, within_minutes=30
        )
        if existing:
            return None

        alert = await self.alert_repo.create(
            organization_id=device.organization_id,
            device_id=device.id,
            rule_id=rule.id,
            alert_type=rule.rule_type,
            severity=rule.severity,
            title=self._build_title(rule, device),
            message=self._build_message(rule, device, location),
            metadata_={
                "latitude": location.latitude,
                "longitude": location.longitude,
                "speed": location.speed,
                "battery_level": location.battery_level,
                "threshold": (rule.conditions or {}).get("threshold"),
            },
            state="open",
        )

        await RedisService.publish(
            RedisChannels.ALERT_TRIGGERED,
            {
                "alert_id": alert.id,
                "organization_id": device.organization_id,
                "device_id": device.id,
                "alert_type": rule.rule_type,
                "severity": rule.severity,
                "title": alert.title,
            },
        )

        await self._notify_org_admins(device.organization_id, alert)
        return alert

    async def _create_alert_for_offline(self, rule: AlertRule, ds: DeviceStatus) -> Any:
        existing = await self.alert_repo.find_recent_same_type(
            ds.organization_id, ds.device_id, "offline_device", within_minutes=60
        )
        if existing:
            return None

        alert = await self.alert_repo.create(
            organization_id=ds.organization_id,
            device_id=ds.device_id,
            rule_id=rule.id,
            alert_type="offline_device",
            severity=rule.severity,
            title=f"Device offline: {ds.device_id}",
            message=f"Device has been offline since {ds.last_received_at}",
            metadata_={"last_received_at": str(ds.last_received_at)},
            state="open",
        )

        await RedisService.publish(
            RedisChannels.ALERT_TRIGGERED,
            {
                "alert_id": alert.id,
                "organization_id": ds.organization_id,
                "device_id": ds.device_id,
                "alert_type": "offline_device",
                "severity": rule.severity,
                "title": alert.title,
            },
        )
        return alert

    def _build_title(self, rule: AlertRule, device: Device) -> str:
        titles = {
            "speeding": f"Speeding detected: {device.name}",
            "low_battery": f"Low battery: {device.name}",
            "signal_loss": f"Signal loss: {device.name}",
            "gps_accuracy": f"GPS degraded: {device.name}",
            "idle_timeout": f"Idle timeout: {device.name}",
            "unauthorized_movement": f"Unauthorized movement: {device.name}",
            "geofence_entry": f"Geofence entry: {device.name}",
            "geofence_exit": f"Geofence exit: {device.name}",
        }
        return titles.get(rule.rule_type, f"Alert: {device.name}")

    def _build_message(self, rule: AlertRule, device: Device, location: Location) -> str:
        threshold = (rule.conditions or {}).get("threshold", "")
        if rule.rule_type == "speeding":
            return (
                f"{device.name} exceeded speed limit of {threshold} km/h "
                f"(current: {location.speed} km/h)"
            )
        elif rule.rule_type == "low_battery":
            return f"{device.name} battery at {location.battery_level}% (threshold: {threshold}%)"
        elif rule.rule_type == "signal_loss":
            return (
                f"{device.name} signal at {location.signal_strength} dBm "
                f"(threshold: {threshold} dBm)"
            )
        elif rule.rule_type == "gps_accuracy":
            return f"{device.name} GPS accuracy {location.accuracy}m (threshold: {threshold}m)"
        return f"Alert triggered for {device.name}"

    async def _notify_org_admins(self, org_id: str, alert: Any) -> None:
        profiles = await self.profile_repo.list_by_organization(org_id)
        for profile in profiles:
            if profile.role in ("owner", "admin", "manager"):
                await self.notif_repo.create(
                    organization_id=org_id,
                    user_id=profile.id,
                    notification_type="alert",
                    title=f"Alert: {alert.title}",
                    message=alert.message,
                    resource_type="alert",
                    resource_id=alert.id,
                )

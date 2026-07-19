// ============================================================================
// Canonical frontend types — synchronized with backend Pydantic schemas.
// The backend API returns snake_case JSON. Frontend types match exactly.
// ============================================================================

export type Role = "owner" | "admin" | "manager" | "operator" | "viewer";

export type TeamRole = "lead" | "member";

export const PERMISSIONS = [
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
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type DeviceStatus = "active" | "inactive" | "maintenance" | "retired";

export type DeviceType = "vehicle_tracker" | "phone" | "iot_gps" | "field_worker";

export type OrganizationPlan = "free" | "starter" | "pro" | "enterprise";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationBrief {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
}

export interface OrganizationUpdate {
  name?: string;
  plan?: OrganizationPlan;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_active: boolean;
}

export interface ProfileUpdate {
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
}

export interface MeResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  organization: OrganizationBrief | null;
  permissions: string[];
}

export interface Team {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamCreate {
  name: string;
  description?: string;
}

export interface TeamUpdate {
  name?: string;
  description?: string;
}

export interface TeamMemberResponse {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  created_at: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface AddMemberRequest {
  user_id: string;
  role: TeamRole;
}

export interface Device {
  id: string;
  organization_id: string;
  name: string;
  external_identifier: string | null;
  device_type: DeviceType;
  status: DeviceStatus;
  assigned_team_id: string | null;
  metadata: Record<string, unknown> | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceCreate {
  name: string;
  external_identifier?: string;
  device_type: DeviceType;
  assigned_team_id?: string;
  metadata?: Record<string, unknown>;
}

export interface DeviceUpdate {
  name?: string;
  external_identifier?: string;
  device_type?: DeviceType;
  status?: DeviceStatus;
  assigned_team_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ============================================================================
// Phase 5: Location & Trip types
// ============================================================================

export type DeviceOnlineStatus = "online" | "offline" | "idle" | "moving" | "stopped";

export type LocationProvider = "gps" | "network" | "fused" | null;

export interface Location {
  id: string;
  device_id: string;
  organization_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  battery_level: number | null;
  signal_strength: number | null;
  provider: LocationProvider;
  captured_at: string;
  received_at: string;
}

export interface LocationIngest {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  battery_level?: number;
  signal_strength?: number;
  provider?: LocationProvider;
  captured_at: string;
}

export interface DeviceTrackingStatus {
  device_id: string;
  organization_id: string;
  status: DeviceOnlineStatus;
  last_latitude: number | null;
  last_longitude: number | null;
  last_heading: number | null;
  last_speed: number | null;
  last_battery_level: number | null;
  last_captured_at: string | null;
  last_received_at: string | null;
  current_trip_id: string | null;
  updated_at: string;
}

export type TripStatus = "active" | "completed" | "cancelled";

export interface Trip {
  id: string;
  device_id: string;
  organization_id: string;
  start_time: string;
  end_time: string | null;
  distance_meters: number;
  duration_seconds: number | null;
  avg_speed_kmh: number | null;
  max_speed_kmh: number | null;
  idle_duration_seconds: number;
  point_count: number;
  status: TripStatus;
  created_at: string;
  updated_at: string;
}

export interface DeviceCredential {
  id: string;
  device_id: string;
  api_key_prefix: string;
  status: "active" | "suspended" | "revoked";
  issued_at: string;
  expires_at: string | null;
  last_used_at: string | null;
}

export interface DeviceCredentialCreate {
  credential: DeviceCredential;
  api_key: string;
  secret: string;
}

export interface WebSocketMessage {
  type: string;
  data: {
    device_id?: string;
    organization_id?: string;
    latitude?: number;
    longitude?: number;
    heading?: number;
    speed?: number;
    battery_level?: number;
    captured_at?: string;
    trip_id?: string;
    start_time?: string;
    end_time?: string;
    distance_meters?: number;
    duration_seconds?: number;
  };
}

// ============================================================================
// Phase 6: Geofencing, Alerts, Rules, Analytics, Notifications
// ============================================================================

export type GeofenceType = "polygon" | "circle";
export type GeofenceEventType = "enter" | "exit" | "dwell" | "boundary_cross" | "rapid_reentry";
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertState = "open" | "acknowledged" | "resolved";
export type AlertRuleType =
  | "speeding"
  | "idle_timeout"
  | "offline_device"
  | "low_battery"
  | "geofence_entry"
  | "geofence_exit"
  | "unauthorized_movement"
  | "signal_loss"
  | "gps_accuracy"
  | "custom";
export type NotificationType = "alert" | "geofence_event" | "system" | "trip";

export interface Geofence {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  geofence_type: GeofenceType;
  radius_meters: number | null;
  priority: number;
  parent_geofence_id: string | null;
  is_enabled: boolean;
  is_archived: boolean;
  color: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CircleGeofenceCreate {
  name: string;
  geofence_type: "circle";
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  priority?: number;
  parent_geofence_id?: string;
  is_enabled?: boolean;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface PolygonGeofenceCreate {
  name: string;
  geofence_type: "polygon";
  coordinates: Array<{ lat: number; lng: number }>;
  priority?: number;
  parent_geofence_id?: string;
  is_enabled?: boolean;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface GeofenceUpdate {
  name?: string;
  description?: string;
  priority?: number;
  is_enabled?: boolean;
  is_archived?: boolean;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface GeofenceEvent {
  id: string;
  geofence_id: string;
  device_id: string;
  organization_id: string;
  event_type: GeofenceEventType;
  latitude: number;
  longitude: number;
  duration_seconds: number | null;
  created_at: string;
}

export interface Alert {
  id: string;
  organization_id: string;
  device_id: string;
  rule_id: string | null;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  state: AlertState;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  triggered_at: string;
  created_at: string;
}

export interface AlertRule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  rule_type: AlertRuleType;
  conditions: Record<string, unknown>;
  severity: AlertSeverity;
  priority: number;
  is_enabled: boolean;
  schedule_start: string | null;
  schedule_end: string | null;
  schedule_days: number[] | null;
  geofence_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertRuleCreate {
  name: string;
  rule_type: AlertRuleType;
  conditions: Record<string, unknown>;
  severity?: AlertSeverity;
  priority?: number;
  is_enabled?: boolean;
  schedule_start?: string;
  schedule_end?: string;
  schedule_days?: number[];
  geofence_id?: string;
}

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  resource_type: string | null;
  resource_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface FleetAnalytics {
  active_devices: number;
  moving_devices: number;
  idle_devices: number;
  offline_devices: number;
  total_devices: number;
  fleet_utilization_pct: number;
  avg_speed_kmh: number;
  trips_today: number;
  distance_today_meters: number;
  alerts_today: number;
  alerts_open: number;
  geofences_active: number;
}

export interface TrendPoint {
  date: string;
  active_devices: number;
  moving_devices: number;
  trips_count: number;
  alerts_count: number;
  total_distance_meters: number;
  fleet_utilization_pct: number;
}

export interface TopDevice {
  device_id: string;
  device_name: string;
  trip_count: number;
  total_distance_meters: number;
  max_speed_kmh: number;
}

export interface SearchResults {
  devices: Array<Record<string, unknown>>;
  teams: Array<Record<string, unknown>>;
  trips: Array<Record<string, unknown>>;
  geofences: Array<Record<string, unknown>>;
  alerts: Array<Record<string, unknown>>;
  total: number;
}

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

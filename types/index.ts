// ============================================================================
// Canonical frontend types — synchronized with backend Pydantic schemas.
// The backend API returns snake_case JSON. Frontend types match exactly.
// ============================================================================

// ─── RBAC ───────────────────────────────────────────────────────────────────

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

// ─── Enums ──────────────────────────────────────────────────────────────────

export type DeviceStatus = "active" | "inactive" | "maintenance" | "retired";

export type DeviceType = "vehicle_tracker" | "phone" | "iot_gps" | "field_worker";

export type OrganizationPlan = "free" | "starter" | "pro" | "enterprise";

// ─── UI Helpers ─────────────────────────────────────────────────────────────

export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning";

// ─── Organization ───────────────────────────────────────────────────────────

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

// ─── Profile ────────────────────────────────────────────────────────────────

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

// ─── Me ─────────────────────────────────────────────────────────────────────

export interface MeResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  organization: OrganizationBrief | null;
  permissions: string[];
}

// ─── Team ───────────────────────────────────────────────────────────────────

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

// ─── Device ──────────────────────────────────────────────────────────────────

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

// ─── AuditLog ────────────────────────────────────────────────────────────────

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

// ─── Pagination ─────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

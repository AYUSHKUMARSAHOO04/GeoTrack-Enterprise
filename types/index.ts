export type Role = "owner" | "admin" | "manager" | "operator" | "viewer";

export type DeviceStatus = "active" | "inactive" | "maintenance" | "retired";

export type DeviceType = "vehicle_tracker" | "phone" | "iot_gps" | "field_worker";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  createdAt: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface Device {
  id: string;
  organizationId: string;
  name: string;
  externalIdentifier: string | null;
  deviceType: DeviceType;
  status: DeviceStatus;
  assignedTeamId: string | null;
  metadata: Record<string, unknown> | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  organizationId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MeResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
  permissions: string[];
}

export interface DeviceCreateInput {
  name: string;
  externalIdentifier?: string;
  deviceType: DeviceType;
  assignedTeamId?: string;
  metadata?: Record<string, unknown>;
}

export interface DeviceUpdateInput {
  name?: string;
  externalIdentifier?: string;
  deviceType?: DeviceType;
  status?: DeviceStatus;
  assignedTeamId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface TeamCreateInput {
  name: string;
  description?: string;
}

export interface TeamUpdateInput {
  name?: string;
  description?: string;
}

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

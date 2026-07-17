export type UserRole = "super_admin" | "admin" | "manager" | "operator" | "viewer";

export type AuthStatus = "authenticated" | "unauthenticated" | "loading";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  isActive: boolean;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  createdAt: string;
}

export interface Device {
  id: string;
  name: string;
  identifier: string;
  type: "vehicle" | "asset" | "person";
  status: "online" | "offline" | "idle";
  batteryLevel: number | null;
  lastSeenAt: string | null;
  organizationId: string;
  teamId: string | null;
  createdAt: string;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  timestamp: string;
}

export interface DeviceLocation extends LocationPoint {
  deviceId: string;
}

export interface Trip {
  id: string;
  deviceId: string;
  startTime: string;
  endTime: string | null;
  distance: number;
  duration: number;
  startLocation: LocationPoint;
  endLocation: LocationPoint | null;
  status: "active" | "completed" | "cancelled";
}

export interface Geofence {
  id: string;
  name: string;
  description: string | null;
  type: "circle" | "polygon";
  coordinates: { type: string; geometry: { type: string; coordinates: unknown } };
  radius: number | null;
  organizationId: string;
  isActive: boolean;
  createdAt: string;
}

export interface Alert {
  id: string;
  type: "geofence_enter" | "geofence_exit" | "speed_limit" | "device_offline" | "low_battery";
  severity: "info" | "warning" | "critical";
  message: string;
  deviceId: string | null;
  organizationId: string;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  detail: string;
  code: string | null;
  field: string | null;
}

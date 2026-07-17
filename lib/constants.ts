export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:8000/api/v1/ws";

export const TOKEN_STORAGE_KEY = "geotrack.access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "geotrack.refresh_token";

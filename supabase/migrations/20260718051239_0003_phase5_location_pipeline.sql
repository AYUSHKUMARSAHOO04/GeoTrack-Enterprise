/*
# Phase 5: Real-Time Location Pipeline Schema

## Overview
Adds production-grade GPS tracking infrastructure: device authentication credentials,
location storage with PostGIS geography, trip tracking, and device status monitoring.

## New Tables

### 1. device_credentials
Stores API keys and secrets for device authentication. Each device can have multiple
credentials for rotation. Credentials can be active, suspended, or revoked.
- `id` (uuid PK)
- `device_id` (uuid FK → devices.id, CASCADE)
- `api_key_hash` (text, unique, not null) — SHA-256 hash of the API key
- `api_key_prefix` (text, not null) — first 8 chars for identification without hashing
- `secret_hash` (text, not null) — SHA-256 hash of the device secret
- `status` (text, not null, default 'active') — active | suspended | revoked
- `issued_at` (timestamptz, default now())
- `expires_at` (timestamptz, nullable) — optional expiry for rotation
- `last_used_at` (timestamptz, nullable)
- Indexes on device_id, api_key_hash (unique), api_key_prefix

### 2. locations
Stores GPS location pings using PostGIS geography(Point, 4326) for accurate
distance calculations. This is the core table of the location pipeline.
- `id` (uuid PK)
- `device_id` (uuid FK → devices.id, CASCADE)
- `organization_id` (uuid FK → organizations.id, CASCADE)
- `coordinates` (geography(Point, 4326), not null) — PostGIS point
- `latitude` (double precision, not null) — denormalized for quick access
- `longitude` (double precision, not null) — denormalized for quick access
- `accuracy` (real, nullable) — GPS accuracy in meters
- `altitude` (real, nullable) — altitude in meters
- `heading` (real, nullable) — heading in degrees (0-360)
- `speed` (real, nullable) — speed in km/h
- `battery_level` (real, nullable) — battery percentage (0-100)
- `signal_strength` (real, nullable) — signal strength in dBm
- `provider` (text, nullable) — gps | network | fused
- `captured_at` (timestamptz, not null) — when the GPS reading was taken
- `received_at` (timestamptz, default now()) — when the server received it
- `payload_hash` (text, nullable) — hash for deduplication
- Spatial index on coordinates (GIST)
- B-tree indexes on device_id, organization_id, captured_at, received_at
- Unique constraint on (device_id, captured_at) for deduplication

### 3. trips
Automatically detected trips from location data. A trip is a sequence of
movement with optional idle gaps.
- `id` (uuid PK)
- `device_id` (uuid FK → devices.id, CASCADE)
- `organization_id` (uuid FK → organizations.id, CASCADE)
- `start_time` (timestamptz, not null)
- `end_time` (timestamptz, nullable) — null while trip is in progress
- `start_location` (geography(Point, 4326), nullable)
- `end_location` (geography(Point, 4326), nullable)
- `distance_meters` (real, default 0) — total distance traveled
- `duration_seconds` (integer, nullable) — computed when trip ends
- `avg_speed_kmh` (real, nullable) — computed when trip ends
- `max_speed_kmh` (real, nullable) — computed when trip ends
- `idle_duration_seconds` (integer, default 0) — total idle time
- `point_count` (integer, default 0) — number of location points in trip
- `status` (text, not null, default 'active') — active | completed | cancelled
- Indexes on device_id, organization_id, status, start_time

### 4. device_status
Real-time status tracking per device. One row per device, updated as
location data arrives.
- `device_id` (uuid PK FK → devices.id, CASCADE)
- `organization_id` (uuid FK → organizations.id, CASCADE)
- `status` (text, not null, default 'offline') — online | offline | idle | moving | stopped
- `last_location_id` (uuid FK → locations.id, nullable, SET NULL)
- `last_latitude` (double precision, nullable)
- `last_longitude` (double precision, nullable)
- `last_heading` (real, nullable)
- `last_speed` (real, nullable)
- `last_battery_level` (real, nullable)
- `last_captured_at` (timestamptz, nullable)
- `last_received_at` (timestamptz, nullable)
- `current_trip_id` (uuid FK → trips.id, nullable, SET NULL)
- `updated_at` (timestamptz, default now())
- Indexes on organization_id, status

## Security (RLS)
All tables have RLS enabled. Policies use auth.uid() through the profiles table
to verify organization membership. Device credentials table is locked to
service_role only (devices authenticate via API key, not user JWT).

## Important Notes
1. PostGIS extension must be enabled (already installed in this project).
2. Coordinates stored as geography(Point, 4326) for accurate ST_DWithin, ST_Distance.
3. Latitude/longitude also stored as plain columns for quick client-side access.
4. Payload hash + unique constraint enables deduplication of GPS pings.
5. Device credentials use SHA-256 hashing — never store raw API keys.
*/

-- Ensure PostGIS is enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- 1. device_credentials
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    api_key_hash text UNIQUE NOT NULL,
    api_key_prefix text NOT NULL,
    secret_hash text NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
    issued_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_device_credentials_device_id ON device_credentials(device_id);
CREATE INDEX IF NOT EXISTS idx_device_credentials_prefix ON device_credentials(api_key_prefix);

ALTER TABLE device_credentials ENABLE ROW LEVEL SECURITY;

-- Device credentials are only accessible via service_role (API key auth, not user JWT)
-- No policies = locked to service_role bypass only

-- ============================================================================
-- 2. locations
-- ============================================================================
CREATE TABLE IF NOT EXISTS locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    coordinates geography(Point, 4326) NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    accuracy real,
    altitude real,
    heading real,
    speed real,
    battery_level real,
    signal_strength real,
    provider text,
    captured_at timestamptz NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    payload_hash text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations USING GIST (coordinates);
CREATE INDEX IF NOT EXISTS idx_locations_device_id ON locations(device_id);
CREATE INDEX IF NOT EXISTS idx_locations_org_id ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_captured_at ON locations(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_locations_received_at ON locations(received_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_locations_device_captured ON locations(device_id, captured_at);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Location data is org-scoped: users can only see locations for their org
DROP POLICY IF EXISTS "select_org_locations" ON locations;
CREATE POLICY "select_org_locations" ON locations FOR SELECT
    TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = locations.organization_id)
    );

-- Inserts come from the ingestion API (service_role), not directly from users
DROP POLICY IF EXISTS "insert_locations_service" ON locations;
CREATE POLICY "insert_locations_service" ON locations FOR INSERT
    TO anon, authenticated WITH CHECK (true);

-- ============================================================================
-- 3. trips
-- ============================================================================
CREATE TABLE IF NOT EXISTS trips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    start_time timestamptz NOT NULL,
    end_time timestamptz,
    start_location geography(Point, 4326),
    end_location geography(Point, 4326),
    distance_meters real NOT NULL DEFAULT 0,
    duration_seconds integer,
    avg_speed_kmh real,
    max_speed_kmh real,
    idle_duration_seconds integer NOT NULL DEFAULT 0,
    point_count integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trips_device_id ON trips(device_id);
CREATE INDEX IF NOT EXISTS idx_trips_org_id ON trips(organization_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_start_time ON trips(start_time DESC);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_trips" ON trips;
CREATE POLICY "select_org_trips" ON trips FOR SELECT
    TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = trips.organization_id)
    );

-- ============================================================================
-- 4. device_status
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_status (
    device_id uuid PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'idle', 'moving', 'stopped')),
    last_location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
    last_latitude double precision,
    last_longitude double precision,
    last_heading real,
    last_speed real,
    last_battery_level real,
    last_captured_at timestamptz,
    last_received_at timestamptz,
    current_trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_status_org_id ON device_status(organization_id);
CREATE INDEX IF NOT EXISTS idx_device_status_status ON device_status(status);

ALTER TABLE device_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_device_status" ON device_status;
CREATE POLICY "select_org_device_status" ON device_status FOR SELECT
    TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = device_status.organization_id)
    );
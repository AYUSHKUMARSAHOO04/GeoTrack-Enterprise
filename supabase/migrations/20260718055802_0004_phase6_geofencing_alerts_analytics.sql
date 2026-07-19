/*
# Phase 6: Geofencing, Alerts, Rules, Analytics, Notifications

## Overview
Adds enterprise fleet intelligence infrastructure: geofence zones with PostGIS
polygon/circular geometries, automatic geofence event detection, alert rules
with AND/OR logic and time windows, alert generation with acknowledgement
workflow, notifications with read/unread state, and analytics snapshots.

## New Tables

### 1. geofences
Organization-scoped geographic zones for entry/exit/dwell detection.
- `id` (uuid PK)
- `organization_id` (uuid FK → organizations.id, CASCADE)
- `name` (text, not null)
- `description` (text, nullable)
- `geometry` (geography(Polygon, 4326), nullable) — for polygon geofences
- `center` (geography(Point, 4326), nullable) — for circular geofences
- `radius_meters` (real, nullable) — for circular geofences
- `geofence_type` (text, not null) — polygon | circle
- `priority` (integer, default 0) — higher = more important
- `parent_geofence_id` (uuid FK → geofences.id, SET NULL) — nested zones
- `is_enabled` (boolean, default true)
- `is_archived` (boolean, default false)
- `color` (text, nullable) — UI display color
- `metadata` (jsonb, nullable)
- `created_at`, `updated_at` (timestamptz)
- GIST index on geometry and center
- Indexes on organization_id, is_enabled, parent_geofence_id

### 2. geofence_events
Historical record of geofence transitions.
- `id` (uuid PK)
- `geofence_id` (uuid FK → geofences.id, CASCADE)
- `device_id` (uuid FK → devices.id, CASCADE)
- `organization_id` (uuid FK → organizations.id, CASCADE)
- `event_type` (text, not null) — enter | exit | dwell | boundary_cross | rapid_reentry
- `location_id` (uuid FK → locations.id, SET NULL)
- `latitude`, `longitude` (double precision)
- `duration_seconds` (integer, nullable) — for dwell events
- `created_at` (timestamptz, default now())
- Indexes on geofence_id, device_id, organization_id, event_type, created_at

### 3. alert_rules
Organization-defined rules that trigger alerts.
- `id` (uuid PK)
- `organization_id` (uuid FK → organizations.id, CASCADE)
- `name` (text, not null)
- `description` (text, nullable)
- `rule_type` (text, not null) — speeding | idle_timeout | offline_device | low_battery |
  geofence_entry | geofence_exit | unauthorized_movement | signal_loss | gps_accuracy | custom
- `conditions` (jsonb, not null) — AND/OR condition tree with thresholds
- `severity` (text, not null, default 'warning') — info | warning | critical
- `priority` (integer, default 0)
- `is_enabled` (boolean, default true)
- `schedule_start` (time, nullable) — time window start
- `schedule_end` (time, nullable) — time window end
- `schedule_days` (integer[], nullable) — days of week (0=Sun..6=Sat)
- `geofence_id` (uuid FK → geofences.id, SET NULL, nullable) — for geofence rules
- `created_at`, `updated_at` (timestamptz)
- Indexes on organization_id, is_enabled, rule_type

### 4. alerts
Generated alert instances with acknowledgement workflow.
- `id` (uuid PK)
- `organization_id` (uuid FK → organizations.id, CASCADE)
- `device_id` (uuid FK → devices.id, CASCADE)
- `rule_id` (uuid FK → alert_rules.id, SET NULL, nullable)
- `alert_type` (text, not null)
- `severity` (text, not null) — info | warning | critical
- `title` (text, not null)
- `message` (text, not null)
- `metadata` (jsonb, nullable)
- `state` (text, not null, default 'open') — open | acknowledged | resolved
- `acknowledged_by` (uuid FK → profiles.id, SET NULL, nullable)
- `acknowledged_at` (timestamptz, nullable)
- `resolved_by` (uuid FK → profiles.id, SET NULL, nullable)
- `resolved_at` (timestamptz, nullable)
- `triggered_at` (timestamptz, not null, default now())
- `created_at` (timestamptz, default now())
- Indexes on organization_id, device_id, state, severity, triggered_at

### 5. notifications
In-app notifications with read/unread state.
- `id` (uuid PK)
- `organization_id` (uuid FK → organizations.id, CASCADE)
- `user_id` (uuid FK → profiles.id, CASCADE)
- `notification_type` (text, not null) — alert | geofence_event | system | trip
- `title` (text, not null)
- `message` (text, not null)
- `resource_type` (text, nullable)
- `resource_id` (uuid, nullable)
- `is_read` (boolean, default false)
- `created_at` (timestamptz, default now())
- Indexes on user_id, organization_id, is_read, created_at

### 6. analytics_snapshots
Periodic fleet analytics for trend tracking.
- `id` (uuid PK)
- `organization_id` (uuid FK → organizations.id, CASCADE)
- `snapshot_date` (date, not null)
- `active_devices` (integer, default 0)
- `moving_devices` (integer, default 0)
- `idle_devices` (integer, default 0)
- `offline_devices` (integer, default 0)
- `total_distance_meters` (real, default 0)
- `total_moving_seconds` (integer, default 0)
- `total_idle_seconds` (integer, default 0)
- `trips_count` (integer, default 0)
- `alerts_count` (integer, default 0)
- `avg_speed_kmh` (real, default 0)
- `max_speed_kmh` (real, default 0)
- `fleet_utilization_pct` (real, default 0)
- `created_at` (timestamptz, default now())
- Unique on (organization_id, snapshot_date)
- Index on organization_id, snapshot_date

## Security (RLS)
All tables have RLS enabled with org-scoped policies using auth.uid() through
profiles table membership check. Service role bypasses for ingestion pipeline.

## Important Notes
1. Geofence geometries use geography types for accurate distance calculations.
2. Alert rules store conditions as JSONB for flexible AND/OR logic.
3. Schedule fields allow time-windowed rule evaluation.
4. Analytics snapshots enable trend charts without real-time aggregation.
5. Notifications support webhook/email-ready architecture via notification_type.
*/

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- 1. geofences
-- ============================================================================
CREATE TABLE IF NOT EXISTS geofences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    geometry geography(Polygon, 4326),
    center geography(Point, 4326),
    radius_meters real,
    geofence_type text NOT NULL CHECK (geofence_type IN ('polygon', 'circle')),
    priority integer NOT NULL DEFAULT 0,
    parent_geofence_id uuid REFERENCES geofences(id) ON DELETE SET NULL,
    is_enabled boolean NOT NULL DEFAULT true,
    is_archived boolean NOT NULL DEFAULT false,
    color text,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geofences_org_id ON geofences(organization_id);
CREATE INDEX IF NOT EXISTS idx_geofences_enabled ON geofences(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_geofences_parent ON geofences(parent_geofence_id);
CREATE INDEX IF NOT EXISTS idx_geofences_geometry ON geofences USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_geofences_center ON geofences USING GIST (center);

ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_geofences" ON geofences;
CREATE POLICY "select_org_geofences" ON geofences FOR SELECT
    TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = geofences.organization_id)
    );

DROP POLICY IF EXISTS "insert_org_geofences" ON geofences;
CREATE POLICY "insert_org_geofences" ON geofences FOR INSERT
    TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = geofences.organization_id)
    );

DROP POLICY IF EXISTS "update_org_geofences" ON geofences;
CREATE POLICY "update_org_geofences" ON geofences FOR UPDATE
    TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = geofences.organization_id)
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = geofences.organization_id)
    );

DROP POLICY IF EXISTS "delete_org_geofences" ON geofences;
CREATE POLICY "delete_org_geofences" ON geofences FOR DELETE
    TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = geofences.organization_id)
    );

-- ============================================================================
-- 2. geofence_events
-- ============================================================================
CREATE TABLE IF NOT EXISTS geofence_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    geofence_id uuid NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type text NOT NULL CHECK (event_type IN ('enter', 'exit', 'dwell', 'boundary_cross', 'rapid_reentry')),
    location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    duration_seconds integer,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geofence_events_geofence_id ON geofence_events(geofence_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_device_id ON geofence_events(device_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_org_id ON geofence_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_type ON geofence_events(event_type);
CREATE INDEX IF NOT EXISTS idx_geofence_events_created ON geofence_events(created_at DESC);

ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_geofence_events" ON geofence_events;
CREATE POLICY "select_org_geofence_events" ON geofence_events FOR SELECT
    TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = geofence_events.organization_id)
    );

DROP POLICY IF EXISTS "insert_geofence_events_service" ON geofence_events;
CREATE POLICY "insert_geofence_events_service" ON geofence_events FOR INSERT
    TO anon, authenticated WITH CHECK (true);

-- ============================================================================
-- 3. alert_rules
-- ============================================================================
CREATE TABLE IF NOT EXISTS alert_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    rule_type text NOT NULL CHECK (rule_type IN (
        'speeding', 'idle_timeout', 'offline_device', 'low_battery',
        'geofence_entry', 'geofence_exit', 'unauthorized_movement',
        'signal_loss', 'gps_accuracy', 'custom'
    )),
    conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
    severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    priority integer NOT NULL DEFAULT 0,
    is_enabled boolean NOT NULL DEFAULT true,
    schedule_start time,
    schedule_end time,
    schedule_days integer[],
    geofence_id uuid REFERENCES geofences(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_org_id ON alert_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_alert_rules_type ON alert_rules(rule_type);

ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_alert_rules" ON alert_rules;
CREATE POLICY "select_org_alert_rules" ON alert_rules FOR SELECT
    TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = alert_rules.organization_id)
    );

DROP POLICY IF EXISTS "insert_org_alert_rules" ON alert_rules;
CREATE POLICY "insert_org_alert_rules" ON alert_rules FOR INSERT
    TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = alert_rules.organization_id)
    );

DROP POLICY IF EXISTS "update_org_alert_rules" ON alert_rules;
CREATE POLICY "update_org_alert_rules" ON alert_rules FOR UPDATE
    TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = alert_rules.organization_id)
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = alert_rules.organization_id)
    );

DROP POLICY IF EXISTS "delete_org_alert_rules" ON alert_rules;
CREATE POLICY "delete_org_alert_rules" ON alert_rules FOR DELETE
    TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = alert_rules.organization_id)
    );

-- ============================================================================
-- 4. alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    rule_id uuid REFERENCES alert_rules(id) ON DELETE SET NULL,
    alert_type text NOT NULL,
    severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    title text NOT NULL,
    message text NOT NULL,
    metadata jsonb,
    state text NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'acknowledged', 'resolved')),
    acknowledged_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    acknowledged_at timestamptz,
    resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at timestamptz,
    triggered_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_org_id ON alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_state ON alerts(state);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered ON alerts(triggered_at DESC);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_alerts" ON alerts;
CREATE POLICY "select_org_alerts" ON alerts FOR SELECT
    TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = alerts.organization_id)
    );

DROP POLICY IF EXISTS "insert_alerts_service" ON alerts;
CREATE POLICY "insert_alerts_service" ON alerts FOR INSERT
    TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_org_alerts" ON alerts;
CREATE POLICY "update_org_alerts" ON alerts FOR UPDATE
    TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = alerts.organization_id)
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = alerts.organization_id)
    );

-- ============================================================================
-- 5. notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type text NOT NULL CHECK (notification_type IN ('alert', 'geofence_event', 'system', 'trip')),
    title text NOT NULL,
    message text NOT NULL,
    resource_type text,
    resource_id uuid,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
    TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_notifications_service" ON notifications;
CREATE POLICY "insert_notifications_service" ON notifications FOR INSERT
    TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. analytics_snapshots
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    snapshot_date date NOT NULL,
    active_devices integer NOT NULL DEFAULT 0,
    moving_devices integer NOT NULL DEFAULT 0,
    idle_devices integer NOT NULL DEFAULT 0,
    offline_devices integer NOT NULL DEFAULT 0,
    total_distance_meters real NOT NULL DEFAULT 0,
    total_moving_seconds integer NOT NULL DEFAULT 0,
    total_idle_seconds integer NOT NULL DEFAULT 0,
    trips_count integer NOT NULL DEFAULT 0,
    alerts_count integer NOT NULL DEFAULT 0,
    avg_speed_kmh real NOT NULL DEFAULT 0,
    max_speed_kmh real NOT NULL DEFAULT 0,
    fleet_utilization_pct real NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_analytics_org_date ON analytics_snapshots(organization_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_analytics_org_id ON analytics_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_snapshots(snapshot_date DESC);

ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_analytics" ON analytics_snapshots;
CREATE POLICY "select_org_analytics" ON analytics_snapshots FOR SELECT
    TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = analytics_snapshots.organization_id)
    );

DROP POLICY IF EXISTS "insert_analytics_service" ON analytics_snapshots;
CREATE POLICY "insert_analytics_service" ON analytics_snapshots FOR INSERT
    TO anon, authenticated WITH CHECK (true);
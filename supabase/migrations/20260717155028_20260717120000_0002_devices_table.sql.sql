/*
# Create devices table for GeoTrack Enterprise

## Purpose
Creates the devices table to store trackable assets (vehicle trackers, phones, IoT GPS units, field worker devices).
This table is organization-scoped (multi-tenant) and supports soft deletion.
Device location history will be stored in a separate future Location domain table.

## New Tables
1. `devices` — trackable device assets
   - `id` (uuid, primary key)
   - `organization_id` (uuid FK -> organizations, cascade delete)
   - `name` (text, not null)
   - `external_identifier` (text, nullable)
   - `device_type` (text — vehicle_tracker, phone, iot_gps, field_worker)
   - `status` (text — active, inactive, maintenance, retired)
   - `assigned_team_id` (uuid FK -> teams, set null on delete)
   - `metadata` (jsonb, nullable)
   - `last_seen_at` (timestamptz, nullable)
   - `is_deleted` (boolean, default false — soft deletion flag)
   - `created_at` / `updated_at` (timestamptz)

## Security (RLS)
- Enable RLS on devices
- Authenticated users can only access devices within their own organization
- Users must have a profile linked to the same organization as the device

## Notes
1. Organization-level tenant isolation via RLS
2. Soft deletion via is_deleted flag
3. Indexes on organization_id, status, assigned_team_id, and is_deleted
4. No GPS coordinates stored here — location history belongs to future Location domain
*/

CREATE TABLE IF NOT EXISTS devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    external_identifier text,
    device_type text NOT NULL DEFAULT 'vehicle_tracker' CHECK (device_type IN ('vehicle_tracker', 'phone', 'iot_gps', 'field_worker')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'retired')),
    assigned_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
    metadata jsonb,
    last_seen_at timestamptz,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devices_organization_id ON devices(organization_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_assigned_team_id ON devices(assigned_team_id);
CREATE INDEX IF NOT EXISTS idx_devices_is_deleted ON devices(is_deleted);
CREATE INDEX IF NOT EXISTS idx_devices_external_identifier ON devices(external_identifier);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_devices" ON devices;
CREATE POLICY "select_org_devices" ON devices FOR SELECT
    TO authenticated
    USING (
        organization_id = (
            SELECT organization_id FROM profiles WHERE profiles.id = auth.uid()
        )
        AND is_deleted = false
    );

DROP POLICY IF EXISTS "insert_org_devices" ON devices;
CREATE POLICY "insert_org_devices" ON devices FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = (
            SELECT organization_id FROM profiles WHERE profiles.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "update_org_devices" ON devices;
CREATE POLICY "update_org_devices" ON devices FOR UPDATE
    TO authenticated
    USING (
        organization_id = (
            SELECT organization_id FROM profiles WHERE profiles.id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id = (
            SELECT organization_id FROM profiles WHERE profiles.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "delete_org_devices" ON devices;
CREATE POLICY "delete_org_devices" ON devices FOR DELETE
    TO authenticated
    USING (
        organization_id = (
            SELECT organization_id FROM profiles WHERE profiles.id = auth.uid()
        )
    );

CREATE OR REPLACE FUNCTION trigger_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_devices_updated_at ON devices;
CREATE TRIGGER trigger_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION trigger_devices_updated_at();

/*
# Authentication & Core Schema

## Purpose
Creates the foundational schema for GeoTrack Enterprise: organizations, user profiles,
teams, team membership, and audit logs. Uses Supabase's built-in auth.users for
authentication (email/password) and extends it with application-level tables.

## New Tables
1. `organizations` — company accounts with plan tiers
2. `profiles` — extends auth.users with app-specific data (name, role, org link)
3. `teams` — sub-groups within an organization
4. `team_members` — junction table linking users to teams
5. `audit_logs` — tracks user actions for compliance

## Security (RLS)
- Organizations: org members can read; admins can update
- Profiles: users can read/update own profile; org members can read all profiles
- Teams: org members can read; managers+ can write
- Team members: team members can read; managers+ can write
- Audit logs: admins can read org logs; any user can insert own log

## Notes
1. Uses auth.uid() for ownership checks
2. A trigger auto-creates a profile + organization when a new auth user signs up
3. First user gets admin role, subsequent users get viewer role
4. Role hierarchy: super_admin > admin > manager > operator > viewer
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin', 'admin', 'manager', 'operator', 'viewer')),
    avatar_url text,
    is_active boolean NOT NULL DEFAULT true,
    last_login_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('lead', 'member')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
    action text NOT NULL,
    resource text NOT NULL,
    resource_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_teams_organization_id ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_organization" ON organizations;
CREATE POLICY "select_own_organization" ON organizations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = organizations.id
        )
    );

DROP POLICY IF EXISTS "update_own_organization" ON organizations;
CREATE POLICY "update_own_organization" ON organizations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = organizations.id
            AND profiles.role IN ('super_admin', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = organizations.id
            AND profiles.role IN ('super_admin', 'admin')
        )
    );

DROP POLICY IF EXISTS "insert_organization" ON organizations;
CREATE POLICY "insert_organization" ON organizations FOR INSERT
    TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR organization_id = (
            SELECT organization_id FROM profiles p WHERE p.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
    TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "select_org_teams" ON teams;
CREATE POLICY "select_org_teams" ON teams FOR SELECT
    TO authenticated
    USING (
        organization_id = (
            SELECT organization_id FROM profiles WHERE profiles.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "insert_org_teams" ON teams;
CREATE POLICY "insert_org_teams" ON teams FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = (
            SELECT organization_id FROM profiles WHERE profiles.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super_admin', 'admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "update_org_teams" ON teams;
CREATE POLICY "update_org_teams" ON teams FOR UPDATE
    TO authenticated
    USING (
        organization_id = (
            SELECT organization_id FROM profiles WHERE profiles.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super_admin', 'admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "delete_org_teams" ON teams;
CREATE POLICY "delete_org_teams" ON teams FOR DELETE
    TO authenticated
    USING (
        organization_id = (
            SELECT organization_id FROM profiles WHERE profiles.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super_admin', 'admin')
        )
    );

DROP POLICY IF EXISTS "select_team_members" ON team_members;
CREATE POLICY "select_team_members" ON team_members FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR team_id IN (
            SELECT teams.id FROM teams
            JOIN profiles ON profiles.organization_id = teams.organization_id
            WHERE profiles.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "insert_team_members" ON team_members;
CREATE POLICY "insert_team_members" ON team_members FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super_admin', 'admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "delete_team_members" ON team_members;
CREATE POLICY "delete_team_members" ON team_members FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super_admin', 'admin', 'manager')
        )
    );

DROP POLICY IF EXISTS "select_org_audit_logs" ON audit_logs;
CREATE POLICY "select_org_audit_logs" ON audit_logs FOR SELECT
    TO authenticated
    USING (
        organization_id = (
            SELECT organization_id FROM profiles WHERE profiles.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('super_admin', 'admin')
        )
    );

DROP POLICY IF EXISTS "insert_audit_log" ON audit_logs;
CREATE POLICY "insert_audit_log" ON audit_logs FOR INSERT
    TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_organizations_updated_at ON organizations;
CREATE TRIGGER trigger_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_teams_updated_at ON teams;
CREATE TRIGGER trigger_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    org_id uuid;
    user_count int;
BEGIN
    INSERT INTO organizations (name, slug)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'organization_name', split_part(NEW.email, '@', 1) || ' Organization'),
        LOWER(REPLACE(NEW.email, '@', '-at-'))
    )
    RETURNING id INTO org_id;

    SELECT COUNT(*) INTO user_count FROM profiles;

    INSERT INTO profiles (id, organization_id, email, first_name, last_name, role)
    VALUES (
        NEW.id,
        org_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        CASE WHEN user_count = 0 THEN 'admin' ELSE 'viewer' END
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

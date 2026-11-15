-- ==============================================================================
-- CareSaathi - Supabase PostgreSQL Database Schema & Row Level Security (RLS)
-- Multi-Tenant Family Health & Care Coordination Platform
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Family Accounts Table (Multi-tenant partition)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family_accounts (
    family_id TEXT PRIMARY KEY DEFAULT ('fam_' || uuid_generate_v4()::text),
    family_name TEXT NOT NULL,
    primary_contact_email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. User Accounts Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY DEFAULT ('user_' || uuid_generate_v4()::text),
    family_id TEXT NOT NULL REFERENCES family_accounts(family_id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('family_owner', 'parent_guardian', 'adult_member', 'caregiver')),
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_family ON users(family_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ------------------------------------------------------------------------------
-- 3. Family Member Profiles Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family_profiles (
    profile_id TEXT PRIMARY KEY DEFAULT ('prof_' || uuid_generate_v4()::text),
    family_id TEXT NOT NULL REFERENCES family_accounts(family_id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 0 AND age <= 130),
    age_group TEXT NOT NULL CHECK (age_group IN ('child', 'adult', 'senior')),
    blood_group TEXT,
    emergency_contact TEXT,
    allergies TEXT DEFAULT 'None reported',
    care_notes TEXT,
    created_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_family ON family_profiles(family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_age_group ON family_profiles(age_group);

-- ------------------------------------------------------------------------------
-- 4. Caregiver Delegated Assignments Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS caregiver_assignments (
    assignment_id TEXT PRIMARY KEY DEFAULT ('asgn_' || uuid_generate_v4()::text),
    family_id TEXT NOT NULL REFERENCES family_accounts(family_id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL REFERENCES family_profiles(profile_id) ON DELETE CASCADE,
    caregiver_user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    assigned_by_user_id TEXT NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, caregiver_user_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_caregiver ON caregiver_assignments(caregiver_user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_profile ON caregiver_assignments(profile_id);

-- ------------------------------------------------------------------------------
-- 5. Medications & Prescriptions Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medications (
    medication_id TEXT PRIMARY KEY DEFAULT ('med_' || uuid_generate_v4()::text),
    family_id TEXT NOT NULL REFERENCES family_accounts(family_id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL REFERENCES family_profiles(profile_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    schedule_time TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'Daily',
    refill_days_left INTEGER DEFAULT 14,
    instructions TEXT,
    is_taken_today BOOLEAN DEFAULT FALSE,
    last_taken_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meds_profile ON medications(profile_id);
CREATE INDEX IF NOT EXISTS idx_meds_family ON medications(family_id);

-- ------------------------------------------------------------------------------
-- 6. Healthcare Appointments Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id TEXT PRIMARY KEY DEFAULT ('apt_' || uuid_generate_v4()::text),
    family_id TEXT NOT NULL REFERENCES family_accounts(family_id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL REFERENCES family_profiles(profile_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    specialty TEXT DEFAULT 'General Practitioner',
    appointment_date TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')),
    google_calendar_event_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_family ON appointments(family_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);

-- ------------------------------------------------------------------------------
-- 7. Caregiver Shift Handoff Notes Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS caregiver_handoffs (
    handoff_id TEXT PRIMARY KEY DEFAULT ('hoff_' || uuid_generate_v4()::text),
    family_id TEXT NOT NULL REFERENCES family_accounts(family_id) ON DELETE CASCADE,
    profile_id TEXT REFERENCES family_profiles(profile_id) ON DELETE SET NULL,
    caregiver_name TEXT NOT NULL,
    shift_type TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('routine', 'medium', 'high', 'urgent')),
    notes TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handoffs_family ON caregiver_handoffs(family_id);

-- ------------------------------------------------------------------------------
-- 8. Notifications & Alerts Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    notification_id TEXT PRIMARY KEY DEFAULT ('notif_' || uuid_generate_v4()::text),
    family_id TEXT NOT NULL REFERENCES family_accounts(family_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('medication', 'appointment', 'caregiver', 'safety', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifs_family ON notifications(family_id);

-- ------------------------------------------------------------------------------
-- 9. Audit & Activity Logs Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
    activity_id TEXT PRIMARY KEY DEFAULT ('act_' || uuid_generate_v4()::text),
    family_id TEXT NOT NULL REFERENCES family_accounts(family_id) ON DELETE CASCADE,
    actor_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    icon TEXT DEFAULT '📋',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_family ON activity_logs(family_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE family_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to extract user's family_id from Supabase auth JWT
CREATE OR REPLACE FUNCTION get_auth_family_id()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json->'app_metadata'->>'family_id',
        current_setting('request.jwt.claims', true)::json->'user_metadata'->>'family_id'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper function to extract user's role from Supabase auth JWT
CREATE OR REPLACE FUNCTION get_auth_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role',
        current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- RLS Policy: family_profiles
-- ------------------------------------------------------------------------------

-- 1. Family Owners & Parent/Guardians can view all profiles within their family account
CREATE POLICY "Family owners and guardians can view all family profiles"
ON family_profiles FOR SELECT
USING (
    family_id = get_auth_family_id()
    AND get_auth_role() IN ('family_owner', 'parent_guardian')
);

-- 2. Adult Members can view non-restricted family profiles
CREATE POLICY "Adult members can view family profiles"
ON family_profiles FOR SELECT
USING (
    family_id = get_auth_family_id()
    AND get_auth_role() = 'adult_member'
);

-- 3. Caregivers can ONLY view profiles explicitly assigned to them in caregiver_assignments
CREATE POLICY "Caregivers can only view assigned profiles"
ON family_profiles FOR SELECT
USING (
    family_id = get_auth_family_id()
    AND get_auth_role() = 'caregiver'
    AND profile_id IN (
        SELECT profile_id FROM caregiver_assignments
        WHERE caregiver_user_id = auth.uid()::text
    )
);

-- 4. Only Family Owners and Parent/Guardians can INSERT new profiles
CREATE POLICY "Guardians and owners can create family profiles"
ON family_profiles FOR INSERT
WITH CHECK (
    family_id = get_auth_family_id()
    AND get_auth_role() IN ('family_owner', 'parent_guardian')
);

-- 5. Only Family Owners and Parent/Guardians can UPDATE profiles
CREATE POLICY "Guardians and owners can update family profiles"
ON family_profiles FOR UPDATE
USING (
    family_id = get_auth_family_id()
    AND get_auth_role() IN ('family_owner', 'parent_guardian')
);

-- 6. Caregivers CANNOT delete profiles
CREATE POLICY "Only family owners can delete family profiles"
ON family_profiles FOR DELETE
USING (
    family_id = get_auth_family_id()
    AND get_auth_role() = 'family_owner'
);

-- ------------------------------------------------------------------------------
-- RLS Policy: medications
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view medications of permitted family profiles"
ON medications FOR SELECT
USING (
    family_id = get_auth_family_id()
    AND (
        get_auth_role() IN ('family_owner', 'parent_guardian', 'adult_member')
        OR (
            get_auth_role() = 'caregiver'
            AND profile_id IN (SELECT profile_id FROM caregiver_assignments WHERE caregiver_user_id = auth.uid()::text)
        )
    )
);

-- ------------------------------------------------------------------------------
-- RLS Policy: appointments
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view appointments within their family account"
ON appointments FOR SELECT
USING (
    family_id = get_auth_family_id()
    AND (
        get_auth_role() IN ('family_owner', 'parent_guardian', 'adult_member')
        OR (
            get_auth_role() = 'caregiver'
            AND profile_id IN (SELECT profile_id FROM caregiver_assignments WHERE caregiver_user_id = auth.uid()::text)
        )
    )
);

CREATE POLICY "Owners and guardians can create appointments"
ON appointments FOR INSERT
WITH CHECK (
    family_id = get_auth_family_id()
    AND get_auth_role() IN ('family_owner', 'parent_guardian', 'adult_member')
);

-- ------------------------------------------------------------------------------
-- Service Role Policy (Strictly Backend Use)
-- ------------------------------------------------------------------------------
-- The Supabase Service Role Key automatically bypasses RLS on backend requests,
-- allowing server-side background synchronization and administrative maintenance.

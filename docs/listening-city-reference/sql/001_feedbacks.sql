-- ============================================================
-- The Listening City — Feedbacks schema + RLS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enums
DO $$ BEGIN
  CREATE TYPE feedback_status AS ENUM (
    'PENDING', 'AI_SUGGESTED', 'NEEDS_MANUAL_REVIEW',
    'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE department AS ENUM ('POLICE', 'ENVIRONMENT', 'WARD', 'IOC', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE feedback_category AS ENUM (
    'WASTE', 'TREE', 'FLOOD', 'PARKING', 'SECURITY', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE IF NOT EXISTS feedbacks (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  citizen_id               UUID NOT NULL,
  title                    VARCHAR(255) NOT NULL,
  description              TEXT NOT NULL,
  category                 feedback_category NOT NULL DEFAULT 'OTHER',
  status                   feedback_status NOT NULL DEFAULT 'PENDING',
  assigned_department      department,
  ai_suggested_department  department,
  ai_confidence            NUMERIC(3,2) CHECK (ai_confidence BETWEEN 0 AND 1),
  ai_reasoning             TEXT,
  images                   JSONB DEFAULT '[]'::jsonb,
  location                 GEOGRAPHY(POINT, 4326),
  address_text             VARCHAR(500),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_citizen ON feedbacks(citizen_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_dept ON feedbacks(assigned_department);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_location ON feedbacks USING GIST(location);

-- updated_at trigger
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feedbacks_updated ON feedbacks;
CREATE TRIGGER trg_feedbacks_updated BEFORE UPDATE ON feedbacks
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- Lớp 3 — Row Level Security (defense in depth)
-- App backend SET LOCAL các GUC sau trong mỗi request:
--   SET LOCAL app.user_id   = '<uuid>';
--   SET LOCAL app.user_dept = 'POLICE' | 'ENVIRONMENT' | ...;
--   SET LOCAL app.user_role = 'CITIZEN' | 'OFFICER' | 'IOC' | 'ADMIN';
-- ============================================================
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_select_policy ON feedbacks;
CREATE POLICY feedback_select_policy ON feedbacks FOR SELECT USING (
  current_setting('app.user_role', true) IN ('ADMIN', 'IOC')
  OR citizen_id = NULLIF(current_setting('app.user_id', true), '')::uuid
  OR assigned_department::text = current_setting('app.user_dept', true)
);

DROP POLICY IF EXISTS feedback_insert_policy ON feedbacks;
CREATE POLICY feedback_insert_policy ON feedbacks FOR INSERT WITH CHECK (
  citizen_id = NULLIF(current_setting('app.user_id', true), '')::uuid
);

DROP POLICY IF EXISTS feedback_update_policy ON feedbacks;
CREATE POLICY feedback_update_policy ON feedbacks FOR UPDATE USING (
  current_setting('app.user_role', true) IN ('ADMIN', 'IOC')
  OR assigned_department::text = current_setting('app.user_dept', true)
);

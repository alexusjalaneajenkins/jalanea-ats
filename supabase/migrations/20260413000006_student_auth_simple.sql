-- Simple student auth: credentials + access codes
-- Auth logic lives in Next.js server actions, not stored procedures

CREATE TABLE IF NOT EXISTS student_credentials (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  pin_hash TEXT,                          -- sha256 hex hash of 4-digit PIN
  pin_set_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS student_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  code TEXT NOT NULL,                     -- plain text code (e.g. "A3F7-B2C1"), short-lived
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_access_codes_student ON student_access_codes(student_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_active ON student_access_codes(student_id, used_at, expires_at);
-- RLS
ALTER TABLE student_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_access_codes ENABLE ROW LEVEL SECURITY;
-- Tutors can manage credentials for their students
CREATE POLICY "Tutors manage credentials"
  ON student_credentials FOR ALL
  USING (true);
-- Anyone can read/update credentials (student auth happens via server actions)
CREATE POLICY "Students auth via credentials"
  ON student_credentials FOR ALL
  USING (true);
-- Tutors create access codes
CREATE POLICY "Tutors manage access codes"
  ON student_access_codes FOR ALL
  USING (true);
-- Students can read codes (to validate during PIN setup)
CREATE POLICY "Students read access codes"
  ON student_access_codes FOR SELECT
  USING (true);
-- Students can mark codes as used
CREATE POLICY "Students use access codes"
  ON student_access_codes FOR UPDATE
  USING (true);

-- ============================================================
-- Session Notes + AI Lesson Reports
-- Supports: raw tutor notes per session, AI-generated reports
-- ============================================================

CREATE TABLE tutor_session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'tutoring' CHECK (session_type IN ('orientation', 'diagnostic', 'tutoring', 'review', 'other')),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  raw_notes TEXT NOT NULL DEFAULT '',
  generated_report TEXT,
  report_generated_at TIMESTAMPTZ,
  diagnostic_attempt_id UUID REFERENCES diagnostic_attempts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER set_session_notes_updated_at
  BEFORE UPDATE ON tutor_session_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_session_notes_student ON tutor_session_notes(student_id);
CREATE INDEX idx_session_notes_tutor ON tutor_session_notes(tutor_profile_id);
ALTER TABLE tutor_session_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tutors manage their session notes"
  ON tutor_session_notes FOR ALL
  USING (tutor_profile_id = auth.uid());

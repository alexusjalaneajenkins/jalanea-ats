-- ────────────────────────────────────────────────────────────────────
-- Curriculum Assignments
--
-- Mirrors the diagnostic_attempts pattern. When a tutor assigns a
-- curriculum lesson (e.g. "3-1-three-digit-addition") to a student,
-- a row goes here. The lesson_slug is a TEXT (not FK) because
-- curriculum content lives in TypeScript files, not the DB.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE curriculum_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  /** Slug of the sub-lesson, e.g. "3-1-three-digit-addition" or "1-1-definition-and-purpose".
   *  Not a foreign key because the curriculum content lives in TS files,
   *  not in the DB. If a slug is renamed in the codebase, old assignments
   *  that reference the old slug become orphaned but won't error. */
  lesson_slug TEXT NOT NULL,
  tutor_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  /** Optional tutor note shown to the student, e.g. "Mason — focus on
   *  borrowing in this one. We'll review together Friday." */
  notes TEXT
);
CREATE INDEX idx_curr_assignments_student ON curriculum_assignments(student_id);
CREATE INDEX idx_curr_assignments_slug ON curriculum_assignments(lesson_slug);
CREATE INDEX idx_curr_assignments_tutor ON curriculum_assignments(tutor_profile_id);
-- ─── Row-Level Security (mirrors diagnostic_attempts) ──────────────

ALTER TABLE curriculum_assignments ENABLE ROW LEVEL SECURITY;
-- Tutors fully manage assignments they created
CREATE POLICY "Tutors manage curriculum assignments"
  ON curriculum_assignments FOR ALL
  USING (tutor_profile_id = auth.uid())
  WITH CHECK (tutor_profile_id = auth.uid());
-- Students can read their assignments (matches the permissive read on
-- diagnostic_attempts; tighten later if student-auth tightens)
CREATE POLICY "Students read curriculum assignments"
  ON curriculum_assignments FOR SELECT
  USING (true);

-- Pinned students for sidebar (max 4 per tutor)
CREATE TABLE pinned_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(tutor_profile_id, student_id)
);
ALTER TABLE pinned_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tutors manage their pins" ON pinned_students FOR ALL USING (tutor_profile_id = auth.uid());
-- Add hourly rate to students
ALTER TABLE students ADD COLUMN hourly_rate NUMERIC(6,2);

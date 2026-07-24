-- ────────────────────────────────────────────────────────────────────
-- Curriculum Assignments — hardening (from 2026-05 code review)
--
-- 1. Dedupe + UNIQUE(student_id, lesson_slug): re-assigning the same
--    lesson to the same student was inserting duplicate rows that
--    rendered as duplicate cards on the student home forever.
-- 2. KNOWN REMAINING HOLE (needs service-role key before it can close):
--    the "Students read curriculum assignments" SELECT policy is
--    USING (true) with no TO clause, so the public anon key can dump
--    the table via PostgREST. Student reads are cookie-authenticated
--    in Next.js server actions (no Supabase session), so RLS cannot
--    distinguish students. Proper fix = SUPABASE_SERVICE_ROLE_KEY in
--    server env + service-role client for student reads + drop the
--    anon SELECT policy. Until then the server action gates access
--    (cookie match or authenticated tutor) — defense at the app layer.
-- ────────────────────────────────────────────────────────────────────

-- Dedupe existing rows: keep the NEWEST row per (student, lesson)
-- (newest carries the tutor's latest note), delete older duplicates.
DELETE FROM curriculum_assignments a
USING curriculum_assignments b
WHERE a.student_id = b.student_id
  AND a.lesson_slug = b.lesson_slug
  AND (a.assigned_at < b.assigned_at
       OR (a.assigned_at = b.assigned_at AND a.id < b.id));
ALTER TABLE curriculum_assignments
  ADD CONSTRAINT curriculum_assignments_student_lesson_key
  UNIQUE (student_id, lesson_slug);

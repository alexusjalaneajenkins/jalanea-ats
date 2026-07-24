-- ────────────────────────────────────────────────────────────────────
-- Per-student session link (online-only platform).
--
-- Each student has ONE persistent online classroom link (e.g. their
-- Lessonspace room) that the tutor reuses every session. Stored here so
-- the tutor saves it once and joins with a single click from the app.
--
-- Nullable, no default — a student without a link simply shows an
-- "add a session link" prompt instead of a Join button. Existing RLS on
-- public.students already covers this column (staff manage their students).
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS session_link text;
COMMENT ON COLUMN public.students.session_link IS
  'Persistent online classroom URL (e.g. Lessonspace room) for one-click join. Nullable.';

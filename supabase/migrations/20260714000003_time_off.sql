-- ────────────────────────────────────────────────────────────────────
-- Tutor time off (wave G: "Time off")
--
-- Two staff-only tables back the tutor's away planning:
-- 1. time_off — individual days or date ranges the tutor is unavailable,
--    added in advance. One row per stretch (start_date..end_date, both
--    inclusive). A CHECK keeps end_date on or after start_date. Staff
--    (is_staff()) get full access; nobody else sees these rows.
-- 2. practice_settings — a single-row table (id is a boolean pinned to
--    true, so at most one row can ever exist) holding "resumes_on", the
--    date tutoring picks back up. Seeded with one row up front so the
--    server always has something to read and upsert. Staff read, insert,
--    and update it; it is never deleted.
-- The drafted parent heads-up that goes out is composed server-side and
-- reviewed by the tutor before sending — no state for that lives here.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
COMMENT ON TABLE public.time_off IS
  'Tutor days off / date ranges (both dates inclusive). Staff-only via RLS.';
CREATE INDEX IF NOT EXISTS time_off_start_date_idx
  ON public.time_off (start_date);
ALTER TABLE public.time_off ENABLE ROW LEVEL SECURITY;
-- Staff manage every time-off row (read / add / edit / remove); the
-- table is invisible to everyone else.
DROP POLICY IF EXISTS "time off staff manage" ON public.time_off;
CREATE POLICY "time off staff manage" ON public.time_off
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE TABLE IF NOT EXISTS public.practice_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  resumes_on date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.practice_settings IS
  'Singleton (id pinned to true) practice-wide settings, e.g. resumes_on. Staff read + upsert via RLS.';
ALTER TABLE public.practice_settings ENABLE ROW LEVEL SECURITY;
-- Staff read the singleton and upsert it (insert the row once, then
-- update resumes_on thereafter). No delete policy: the row is permanent.
DROP POLICY IF EXISTS "practice settings staff read" ON public.practice_settings;
CREATE POLICY "practice settings staff read" ON public.practice_settings
  FOR SELECT TO authenticated
  USING (public.is_staff());
DROP POLICY IF EXISTS "practice settings staff insert" ON public.practice_settings;
CREATE POLICY "practice settings staff insert" ON public.practice_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "practice settings staff update" ON public.practice_settings;
CREATE POLICY "practice settings staff update" ON public.practice_settings
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
-- Seed the singleton so getResumesOn/setResumesOn always have a row to
-- read and update from day one.
INSERT INTO public.practice_settings (id) VALUES (true)
ON CONFLICT DO NOTHING;

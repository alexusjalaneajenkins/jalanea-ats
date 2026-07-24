-- ────────────────────────────────────────────────────────────────────
-- Student goals & visible progress (foundation)
--
-- One staff-only table backs the "top 3 goals" system: a tutor sets up
-- to 3 active, measurable goals per student (co-created with them) and
-- tracks visible progress toward each.
--
-- Each goal carries a type — grade (grade-level), skill (accuracy %),
-- speed (time, where LOWER is better), habit (a count) — plus a
-- parent-facing title, an optional kid-friendly wording, a unit label,
-- and three numbers: baseline_value (where they started), current_value
-- (where they are now), and target_value (the goal). Progress math is
-- type-agnostic and works for "lower is better" too; it lives in the
-- server action, not here.
--
-- Lifecycle status walks active → achieved_pending (data says reached,
-- awaiting the tutor's confirm) → achieved, or → retired (freed slot).
-- In this v1 progress is set MANUALLY by the tutor; auto-tracking from
-- session data is a later build.
--
-- The "max 3 active goals per student" rule is NOT a SQL constraint —
-- it is enforced in createGoal so it can return a friendly message.
-- Staff (is_staff(), defined in 20260713000003_messaging.sql) get full
-- access; the table is invisible to everyone else.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.student_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  goal_type text NOT NULL CHECK (goal_type IN ('grade', 'skill', 'speed', 'habit')),
  title text NOT NULL,
  kid_title text,
  unit text NOT NULL,
  baseline_value numeric NOT NULL,
  current_value numeric NOT NULL,
  target_value numeric NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'achieved_pending', 'achieved', 'retired')),
  target_date date,
  -- Authorship only. A goal belongs to the STUDENT (student_id cascades on
  -- student removal), not the tutor who wrote it. We deliberately DON'T
  -- cascade on the auth user (unlike time_off) so rotating or removing a
  -- tutor account can never wipe a student's goal history — the delete is
  -- RESTRICTed instead, which is the safer failure for a single-tutor practice.
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  achieved_at timestamptz
);
COMMENT ON TABLE public.student_goals IS
  'Top-3 measurable goals per student (grade/skill/speed/habit) with tutor-tracked progress. Staff-only via RLS; max-3-active enforced in the action.';
CREATE INDEX IF NOT EXISTS student_goals_student_status_idx
  ON public.student_goals (student_id, status);
ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY;
-- Staff manage every goal row (read / create / update progress / mark
-- achieved / retire); the table is invisible to everyone else.
DROP POLICY IF EXISTS "student goals staff manage" ON public.student_goals;
CREATE POLICY "student goals staff manage" ON public.student_goals
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

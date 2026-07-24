-- ────────────────────────────────────────────────────────────────────
-- Goals v2.1 Phase 1 — habits-first (docs/plans/2026-07-15-goals-v2-system-plan.md)
--
-- One north star per student; up to 3 tiny habits build toward it.
-- Habits are the tracked unit: reps accrue automatically (session logged,
-- lesson section completed, practice finished, mood check-in) plus tutor
-- and (later) parent taps. Reps are binary per (habit, day, source) — a
-- streak can pause, never fail; the count measures the habit, never the
-- miss count.
--
-- HISTORY IS TRIGGER-WRITTEN (adversarial finding #6): goal_events rows
-- are created by AFTER triggers in the SAME transaction as the change —
-- covering every server action, every future action, and manual SQL.
-- Actions never write events directly, so history can't silently skip.
-- Revisions carry a parent-visible reason via last_change_reason, which
-- the trigger copies into the event detail.
--
-- SECURITY MODEL:
--   goal_habits   staff-only (is_staff() FOR ALL), like student_goals.
--   habit_reps    staff ALL; INSERT open (students write via cookie-gated
--                 server actions running as anon — the prompt_events
--                 posture); append-only (no UPDATE/DELETE policies);
--                 UNIQUE(habit_id, occurred_on, source) hard-enforces
--                 binary-per-day so an open INSERT can't inflate streaks.
--   goal_events   staff SELECT only. No INSERT/UPDATE/DELETE policies —
--                 rows exist ONLY via the SECURITY DEFINER trigger fn.
-- Parents get NO table access anywhere (Phase 2 reads go through
-- allowlisted definer functions; finding #3).
-- ────────────────────────────────────────────────────────────────────

-- ── North star: the why, consent, and the two honest agreement stamps ──
ALTER TABLE public.student_goals
  ADD COLUMN IF NOT EXISTS why text,
  ADD COLUMN IF NOT EXISTS why_shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreement_witnessed_at timestamptz,
  ADD COLUMN IF NOT EXISTS student_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_change_reason text;
COMMENT ON COLUMN public.student_goals.why IS
  'The kid''s reason, in their words as told to the tutor. Parent-visible ONLY when why_shared.';
COMMENT ON COLUMN public.student_goals.agreement_witnessed_at IS
  'Tutor witnessed a verbal yes over video ("Agreed out loud"). NOT student action.';
COMMENT ON COLUMN public.student_goals.student_confirmed_at IS
  'The student tapped "That''s my goal" on THEIR device (Phase 3). Real assent.';
COMMENT ON COLUMN public.student_goals.last_change_reason IS
  'Set by an action in the same UPDATE; the history trigger copies it into the event detail.';
-- One active north star per student — DB backstop for the action's friendly
-- check (closes the double-submit race). Safe today: no student has >1 active.
CREATE UNIQUE INDEX IF NOT EXISTS student_goals_one_active_idx
  ON public.student_goals (student_id)
  WHERE status = 'active';
-- ── Habits ──
CREATE TABLE IF NOT EXISTS public.goal_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.student_goals(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title text NOT NULL,
  kid_title text,
  cadence text NOT NULL DEFAULT 'per_session'
    CHECK (cadence IN ('per_session', 'weekly', 'daily')),
  -- Which signal feeds this habit's automatic reps. 'tutor'/'parent' = tap-only.
  -- 'retry' is its own source so a second-try rep can never credit a
  -- "finishes practice" habit (they'd collide on 'practice' otherwise).
  rep_source text NOT NULL DEFAULT 'tutor'
    CHECK (rep_source IN ('session', 'lesson', 'practice', 'retry', 'mood', 'tutor', 'parent')),
  home_habit boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS goal_habits_student_status_idx
  ON public.goal_habits (student_id, status);
ALTER TABLE public.goal_habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goal habits staff manage" ON public.goal_habits;
CREATE POLICY "goal habits staff manage" ON public.goal_habits
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
-- ── Reps (append-only; binary per habit/day/source) ──
CREATE TABLE IF NOT EXISTS public.habit_reps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.goal_habits(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  occurred_on date NOT NULL DEFAULT (now() AT TIME ZONE 'America/New_York')::date,
  source text NOT NULL
    CHECK (source IN ('session', 'lesson', 'practice', 'retry', 'mood', 'tutor', 'parent')),
  detail jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, occurred_on, source)
);
CREATE INDEX IF NOT EXISTS habit_reps_student_idx
  ON public.habit_reps (student_id, occurred_on DESC);
ALTER TABLE public.habit_reps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habit reps staff manage" ON public.habit_reps;
CREATE POLICY "habit reps staff manage" ON public.habit_reps
  FOR SELECT TO authenticated
  USING (public.is_staff());
-- Staff (tutor taps + session/mood awards) insert directly; students go
-- through record_student_habit_reps below — NOT an open INSERT policy,
-- which is tighter than the prompt_events posture.
DROP POLICY IF EXISTS "habit reps staff insert" ON public.habit_reps;
CREATE POLICY "habit reps staff insert" ON public.habit_reps
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());
-- No UPDATE/DELETE policies: append-only by design.

-- ── Student auto-rep path (cookie-gated server actions run as anon) ──
-- Students have no Supabase session, so the lesson/practice/retry/mood
-- auto-reps arrive via this narrow SECURITY DEFINER function. Exposure
-- model (deliberate, documented): callable with the public anon key +
-- a student UUID, but it is WRITE-ONLY (returns void, leaks nothing),
-- only touches habits whose rep_source matches, and the UNIQUE
-- constraint caps damage at one rep per habit/day/source. The real gate
-- is the httpOnly student cookie in the calling server action.
CREATE OR REPLACE FUNCTION public.record_student_habit_reps(
  p_student_id uuid,
  p_source text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_student_id IS NULL OR p_source NOT IN ('lesson', 'practice', 'retry', 'mood') THEN
    RETURN;
  END IF;
  INSERT INTO public.habit_reps (habit_id, student_id, occurred_on, source)
  SELECT h.id, h.student_id, (now() AT TIME ZONE 'America/New_York')::date, p_source
  FROM public.goal_habits h
  WHERE h.student_id = p_student_id
    AND h.status = 'active'
    AND h.rep_source = p_source
  ON CONFLICT (habit_id, occurred_on, source) DO NOTHING;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_student_habit_reps(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_student_habit_reps(uuid, text) TO anon, authenticated;
-- ── History (trigger-written, same transaction) ──
CREATE TABLE IF NOT EXISTS public.goal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.student_goals(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'created', 'target_changed', 'progress', 'achieved', 'retired', 'renewed',
    'updated', 'why_shared_changed', 'habit_added', 'habit_retired'
  )),
  detail jsonb NOT NULL DEFAULT '{}',
  actor text NOT NULL DEFAULT 'tutor' CHECK (actor IN ('tutor', 'system')),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS goal_events_goal_idx
  ON public.goal_events (goal_id, occurred_at DESC);
ALTER TABLE public.goal_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goal events staff read" ON public.goal_events;
CREATE POLICY "goal events staff read" ON public.goal_events
  FOR SELECT TO authenticated
  USING (public.is_staff());
-- No INSERT/UPDATE/DELETE policies: rows exist only via the definer trigger.

-- ── Trigger functions (SECURITY DEFINER so anon/staff DML writes history
--    without any direct grant on goal_events) ──
CREATE OR REPLACE FUNCTION public.log_goal_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev text;
  det jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    ev := 'created';
    det := jsonb_build_object('title', NEW.title, 'target', NEW.target_value,
                              'baseline', NEW.baseline_value, 'unit', NEW.unit);
  ELSE
    IF NEW.status = 'achieved' AND OLD.status IS DISTINCT FROM 'achieved' THEN
      ev := 'achieved';
    ELSIF NEW.status = 'retired' AND OLD.status IS DISTINCT FROM 'retired' THEN
      ev := 'retired';
    ELSIF NEW.status = 'active' AND OLD.status IN ('achieved', 'retired') THEN
      ev := 'renewed';
    ELSIF NEW.target_value IS DISTINCT FROM OLD.target_value
       OR NEW.baseline_value IS DISTINCT FROM OLD.baseline_value THEN
      ev := 'target_changed';
      det := jsonb_build_object('old_target', OLD.target_value, 'new_target', NEW.target_value,
                                'old_baseline', OLD.baseline_value, 'new_baseline', NEW.baseline_value);
    ELSIF NEW.current_value IS DISTINCT FROM OLD.current_value THEN
      ev := 'progress';
      det := jsonb_build_object('old', OLD.current_value, 'new', NEW.current_value);
    ELSIF NEW.why_shared IS DISTINCT FROM OLD.why_shared THEN
      ev := 'why_shared_changed';
      det := jsonb_build_object('shared', NEW.why_shared);
    ELSE
      ev := 'updated';
    END IF;
    IF NEW.last_change_reason IS NOT NULL THEN
      det := det || jsonb_build_object('reason', NEW.last_change_reason);
    END IF;
  END IF;

  INSERT INTO public.goal_events (goal_id, student_id, event_type, detail)
  VALUES (NEW.id, NEW.student_id, ev, det);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_goal_event() FROM PUBLIC, anon;
CREATE OR REPLACE FUNCTION public.log_habit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.goal_events (goal_id, student_id, event_type, detail)
    VALUES (NEW.goal_id, NEW.student_id, 'habit_added',
            jsonb_build_object('habit', NEW.title));
  ELSIF NEW.status = 'retired' AND OLD.status IS DISTINCT FROM 'retired' THEN
    INSERT INTO public.goal_events (goal_id, student_id, event_type, detail)
    VALUES (NEW.goal_id, NEW.student_id, 'habit_retired',
            jsonb_build_object('habit', NEW.title));
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_habit_event() FROM PUBLIC, anon;
DROP TRIGGER IF EXISTS trg_goal_events ON public.student_goals;
CREATE TRIGGER trg_goal_events
  AFTER INSERT OR UPDATE ON public.student_goals
  FOR EACH ROW EXECUTE FUNCTION public.log_goal_event();
DROP TRIGGER IF EXISTS trg_habit_events ON public.goal_habits;
CREATE TRIGGER trg_habit_events
  AFTER INSERT OR UPDATE ON public.goal_habits
  FOR EACH ROW EXECUTE FUNCTION public.log_habit_event();
-- ── Backfill: pre-trigger goals get an honest 'created' event ──
INSERT INTO public.goal_events (goal_id, student_id, event_type, detail, occurred_at)
SELECT g.id, g.student_id, 'created',
       jsonb_build_object('title', g.title, 'backfilled', true),
       g.created_at
FROM public.student_goals g
WHERE NOT EXISTS (
  SELECT 1 FROM public.goal_events e
  WHERE e.goal_id = g.id AND e.event_type = 'created'
);

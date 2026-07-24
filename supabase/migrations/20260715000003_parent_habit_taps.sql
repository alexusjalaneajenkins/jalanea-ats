-- ────────────────────────────────────────────────────────────────────
-- Goals v2.1 Phase 4 — parent home-habit taps ("we did it at home")
--
-- Phase 2 gave parents a read-only window. This is their ONE write: a
-- tap that banks a rep for a habit the tutor authored as a home habit
-- ("read 10 minutes", "asked for a break") — the half of the habit that
-- only happens where we can't see it.
--
-- SECURITY MODEL (the bridge that must not be missing — finding #7 was
-- exactly a write path that trusted a caller-supplied student id):
--   * The student is resolved FROM THE HABIT ROW. The caller supplies a
--     habit id and nothing else, so there is no id to forge: a parent
--     can only ever reach habits that a habit row points at.
--   * That resolved student is then gated on is_guardian_of — the caller
--     must be a LINKED guardian of the habit's OWN student. A guardian of
--     child A holding a habit id of child B gets a plain false.
--   * home_habit = true AND status = 'active' are required. Parents may
--     tap only habits authored FOR home; an in-session habit is not
--     theirs to credit, and a retired one is closed history.
--   * authenticated only (a parent has a real Supabase session, unlike a
--     student). REVOKEd from PUBLIC/anon per the notification-stack rule.
--
-- HONESTY MODEL: reps stay binary per (habit, day, source) — the UNIQUE
-- constraint from Phase 1 does the enforcing, so an anxious double-tap
-- (or a double-submit race) can never inflate a streak. The rep lands
-- under source 'parent', which keeps it distinct from the session/lesson
-- signals: a parent tap and a tutor award on the same day are two honest
-- reps of two different observations, not one event counted twice.
--
-- Returns true when a rep landed OR already existed today — a tap is
-- never "wrong", so the surface has nothing to apologize for. false means
-- refused (unknown habit, not a home habit, retired, or not your child).
-- ────────────────────────────────────────────────────────────────────

/** A parent banks a rep for one of their child's home habits, today (ET). */
CREATE OR REPLACE FUNCTION public.record_parent_habit_rep(p_habit_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  IF p_habit_id IS NULL THEN
    RETURN false;
  END IF;

  -- The student comes from the habit row — NEVER from the caller.
  -- Refusals are indistinguishable by design (unknown / retired / not a
  -- home habit all collapse to a NULL student, then to a plain false),
  -- so this can't be walked to learn which habit ids exist.
  SELECT h.student_id INTO v_student_id
  FROM public.goal_habits h
  WHERE h.id = p_habit_id
    AND h.status = 'active'
    AND h.home_habit;

  IF v_student_id IS NULL THEN
    RETURN false;
  END IF;

  -- The guardian bridge: this caller must be a linked guardian of THIS
  -- habit's student. is_guardian_of is an EXISTS, so it is false (never
  -- NULL) for anon or an unlinked account.
  IF NOT public.is_guardian_of(v_student_id) THEN
    RETURN false;
  END IF;

  INSERT INTO public.habit_reps (habit_id, student_id, occurred_on, source)
  VALUES (
    p_habit_id,
    v_student_id,
    (now() AT TIME ZONE 'America/New_York')::date,
    'parent'
  )
  ON CONFLICT (habit_id, occurred_on, source) DO NOTHING;

  -- True whether the insert landed or the day was already banked: from
  -- the parent's side both mean "it's done today".
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_parent_habit_rep(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_parent_habit_rep(uuid) TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- Goals v2.1 Phase 2 — parent window, D-lite (read-only)
--
-- Parents get NO table access to goals data (adversarial finding #3:
-- row-level security can't hide columns). Every read crosses through a
-- SECURITY DEFINER function gated on is_guardian_of, returning an
-- EXPLICIT allowlist — mirroring get_child_session_recaps exactly.
--
-- Allowlist decisions (deliberate):
--   * why    → only when why_shared (the kid's consent, asked in the
--              goal meeting: "want your family to see your reason?")
--   * agreement stamps (witnessed/confirmed) → NEVER on parent surfaces
--              (finding #1: the stamp must carry no business value a
--              coached yes could inflate)
--   * habits → active only; no rep_source plumbing; rep DAYS only, so
--              parent surfaces render consistency, never raw counts
--              (the #6/#12 error-shaped-habit render rule)
--   * events → 'why_shared_changed' and empty 'updated' events filtered
--              out; everything else is the honest history, reasons
--              included.
-- Hardening: NULL-safe gate (is_guardian_of is false for anon),
-- REVOKE PUBLIC/anon per the notification-stack rules.
-- ────────────────────────────────────────────────────────────────────

-- A habit can carry a standing parent-facing line authored with the
-- template (e.g. "Asking for a break is a skill we teach — every ask is
-- a win"). Explicit data, not a title regex (review finding F4).
ALTER TABLE public.goal_habits ADD COLUMN IF NOT EXISTS parent_note text;
-- Follow-up hardening (review finding F5): the recap fn predates the
-- grants rule and still had default PUBLIC EXECUTE. Data was safe (the
-- guardian gate returns empty) — this closes the door itself.
REVOKE EXECUTE ON FUNCTION public.get_child_session_recaps(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_child_session_recaps(uuid) TO authenticated;
/** The child's north star(s): active first, then achieved. */
CREATE OR REPLACE FUNCTION public.get_child_goals(p_student_id uuid)
RETURNS TABLE (
  id uuid,
  goal_type text,
  title text,
  kid_title text,
  why text,
  unit text,
  baseline_value numeric,
  current_value numeric,
  target_value numeric,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  achieved_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
BEGIN
  IF NOT public.is_guardian_of(p_student_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT g.id, g.goal_type, g.title, g.kid_title,
           CASE WHEN g.why_shared THEN g.why ELSE NULL END AS why,
           g.unit, g.baseline_value, g.current_value, g.target_value,
           g.status, g.created_at, g.updated_at, g.achieved_at
    FROM public.student_goals g
    WHERE g.student_id = p_student_id
      AND g.status IN ('active', 'achieved')
    ORDER BY CASE g.status WHEN 'active' THEN 0 ELSE 1 END, g.created_at DESC
    LIMIT 10;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_child_goals(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_child_goals(uuid) TO authenticated;
/** Active habits with their distinct rep days (last 90) — days only,
 *  so the surface can show consistency but never raw event counts. */
CREATE OR REPLACE FUNCTION public.get_child_habits(p_student_id uuid)
RETURNS TABLE (
  id uuid,
  goal_id uuid,
  title text,
  kid_title text,
  cadence text,
  home_habit boolean,
  parent_note text,
  rep_days date[]
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
BEGIN
  IF NOT public.is_guardian_of(p_student_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT h.id, h.goal_id, h.title, h.kid_title, h.cadence, h.home_habit,
           h.parent_note,
           COALESCE(
             (SELECT array_agg(DISTINCT r.occurred_on ORDER BY r.occurred_on DESC)
              FROM public.habit_reps r
              WHERE r.habit_id = h.id
                AND r.occurred_on >= (now() AT TIME ZONE 'America/New_York')::date - 90),
             '{}'::date[]
           ) AS rep_days
    FROM public.goal_habits h
    WHERE h.student_id = p_student_id
      AND h.status = 'active'
    ORDER BY h.created_at ASC
    LIMIT 12;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_child_habits(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_child_habits(uuid) TO authenticated;
/** The honest history, parent-readable: what changed, when, and why. */
CREATE OR REPLACE FUNCTION public.get_child_goal_events(p_student_id uuid)
RETURNS TABLE (
  goal_id uuid,
  event_type text,
  detail jsonb,
  occurred_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
BEGIN
  IF NOT public.is_guardian_of(p_student_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT e.goal_id, e.event_type, e.detail, e.occurred_at
    FROM public.goal_events e
    WHERE e.student_id = p_student_id
      AND e.event_type NOT IN ('why_shared_changed', 'updated')
    ORDER BY e.occurred_at DESC
    LIMIT 20;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_child_goal_events(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_child_goal_events(uuid) TO authenticated;

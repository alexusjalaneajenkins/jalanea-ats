-- ────────────────────────────────────────────────────────────────────
-- Parent-facing session recap (owner request, 2026-07-13)
--
-- Session notes stay clinical and tutor-only. This adds ONE opt-in,
-- parent-readable field: the tutor writes a recap in caregiver
-- language, and ONLY that field crosses the RLS boundary — via a
-- SECURITY DEFINER function gated on is_guardian_of, never a policy
-- on the notes table itself. Empty recap = nothing shared.
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.tutor_session_notes
  ADD COLUMN IF NOT EXISTS parent_recap text;
/** Guardian-readable recaps for one child: only rows where the tutor
 *  chose to write a recap, and only the non-clinical fields. */
CREATE OR REPLACE FUNCTION public.get_child_session_recaps(p_student_id uuid)
RETURNS TABLE (
  id uuid,
  session_date date,
  session_type text,
  parent_recap text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
BEGIN
  IF NOT public.is_guardian_of(p_student_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT n.id, n.session_date, n.session_type, n.parent_recap
    FROM public.tutor_session_notes n
    WHERE n.student_id = p_student_id
      AND n.parent_recap IS NOT NULL
      AND btrim(n.parent_recap) <> ''
    ORDER BY n.session_date DESC, n.created_at DESC
    LIMIT 50;
END;
$$;

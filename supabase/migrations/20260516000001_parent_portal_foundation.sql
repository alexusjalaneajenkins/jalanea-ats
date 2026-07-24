-- ────────────────────────────────────────────────────────────────────
-- Parent portal foundation (Wave 3)
--
-- 1. Parents can feed the MO scan: mood_checkins gains source='parent'.
-- 2. SECURITY DEFINER helpers so the portal works regardless of the
--    legacy tables' RLS quirks, with authorization enforced INSIDE
--    each function:
--      get_my_children()            — caregiver: students linked to me
--      list_caregiver_profiles()    — tutor/admin: signups to link
--      link_guardian_profile(...)   — tutor/admin: connect account<->guardian
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.mood_checkins DROP CONSTRAINT IF EXISTS mood_checkins_source_check;
ALTER TABLE public.mood_checkins
  ADD CONSTRAINT mood_checkins_source_check CHECK (source IN ('student', 'tutor', 'parent'));
/** The caregiver's linked children. */
CREATE OR REPLACE FUNCTION public.get_my_children()
RETURNS TABLE (student_id uuid, display_name text, grade_band text)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT s.id, s.display_name, s.grade_band
  FROM public.students s
  JOIN public.student_guardians g ON g.student_id = s.id
  WHERE g.guardian_profile_id = auth.uid();
$$;
/** Caregiver accounts available for linking (tutor/admin only). */
CREATE OR REPLACE FUNCTION public.list_caregiver_profiles()
RETURNS TABLE (profile_id uuid, email text, full_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'tutor')
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN QUERY
    SELECT p.id, u.email::text, COALESCE(u.raw_user_meta_data->>'full_name', '')::text
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.role = 'caregiver';
END;
$$;
/** Connect (or disconnect, with NULL) a caregiver account to a
 *  guardian contact row (tutor/admin only). */
CREATE OR REPLACE FUNCTION public.link_guardian_profile(
  p_guardian_row_id uuid,
  p_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'tutor')
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  UPDATE public.student_guardians
  SET guardian_profile_id = p_profile_id
  WHERE id = p_guardian_row_id;
END;
$$;

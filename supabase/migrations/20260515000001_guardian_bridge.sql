-- ────────────────────────────────────────────────────────────────────
-- Guardian bridge (Wave 3 prerequisite — parent portal)
--
-- student_guardians has always been contact-info rows (name, email,
-- phone). This links a guardian row to a real caregiver ACCOUNT
-- (profiles.role = 'caregiver'), which is what the parent portal
-- authorizes against: a caregiver sees exactly the students their
-- profile is linked to.
--
-- Linking is tutor-driven for now (Alexus connects a signup to her
-- student's guardian row); email-match auto-linking can come later.
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.student_guardians
  ADD COLUMN IF NOT EXISTS guardian_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_student_guardians_profile
  ON public.student_guardians(guardian_profile_id)
  WHERE guardian_profile_id IS NOT NULL;
/** RLS helper: is the current auth user a linked guardian of the student? */
CREATE OR REPLACE FUNCTION public.is_guardian_of(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_guardians
    WHERE student_id = p_student_id
      AND guardian_profile_id = auth.uid()
  );
$$;

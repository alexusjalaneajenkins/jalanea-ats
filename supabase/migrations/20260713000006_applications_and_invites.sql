-- ────────────────────────────────────────────────────────────────────
-- Wave E backend: tutor applications + invite-code lookup
--
-- 1. tutor_applications — the public "Apply to tutor" form writes
--    here (insert-only for the public, consent required); admins
--    read and update status in the console.
-- 2. resolve_invite_code — anonymous, SECURITY DEFINER: given a
--    starter code, returns ONLY the student's first name and the
--    code state (valid/expired/used) so the invite landing can greet
--    the child. Possession of the code is the credential.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tutor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (btrim(full_name) <> ''),
  email text NOT NULL CHECK (position('@' in email) > 1),
  phone text,
  location text,
  credentials text[] NOT NULL DEFAULT '{}',
  years_experience text,
  specialties text[] NOT NULL DEFAULT '{}',
  background_check_consent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'reviewing', 'approved', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tutor_applications ENABLE ROW LEVEL SECURITY;
-- Public form: insert only, and only with background-check consent.
DROP POLICY IF EXISTS "applications public insert" ON public.tutor_applications;
CREATE POLICY "applications public insert" ON public.tutor_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (background_check_consent = true);
DROP POLICY IF EXISTS "applications admin read" ON public.tutor_applications;
CREATE POLICY "applications admin read" ON public.tutor_applications
  FOR SELECT TO authenticated
  USING (public.is_staff() AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));
DROP POLICY IF EXISTS "applications admin update" ON public.tutor_applications;
CREATE POLICY "applications admin update" ON public.tutor_applications
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));
/** Invite landing lookup: first name + code state, nothing more. */
CREATE OR REPLACE FUNCTION public.resolve_invite_code(p_code text)
RETURNS TABLE (first_name text, state text)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT s.first_name,
         CASE
           WHEN c.used_at IS NOT NULL THEN 'used'
           WHEN c.expires_at < now() THEN 'expired'
           ELSE 'valid'
         END
  FROM public.student_access_codes c
  JOIN public.students s ON s.id = c.student_id
  WHERE upper(btrim(c.code)) = upper(btrim(p_code))
  ORDER BY c.created_at DESC
  LIMIT 1;
$$;

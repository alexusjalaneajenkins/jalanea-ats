-- ────────────────────────────────────────────────────────────────────
-- Profile self-service — the owner can edit her own profile
--
-- The settings page has been honestly read-only ("no fake phone number,
-- no dead Save button") because there was nowhere to save to: profiles
-- carries full_name/avatar_url/role/billing, but no phone and no
-- business name. This adds them and makes the form real.
--
-- SECURITY — why writes go through a function instead of a policy:
-- RLS gates ROWS, not COLUMNS. The obvious policy —
--   FOR UPDATE USING (id = auth.uid())
-- would let ANY signed-in user update their own row, including
-- `role`. Parents have profile rows too, so that is a one-line
-- privilege escalation to admin. Instead:
--   * SELECT: an own-row policy (reading your own profile leaks nothing).
--   * UPDATE: update_my_profile(), SECURITY DEFINER, which touches an
--     explicit allowlist (full_name, business_name, phone) and can never
--     reach role, billing, or another person's row.
-- Hardened per the repo rule: REVOKE from PUBLIC/anon, GRANT to
-- authenticated (20260714000002_notification_fn_grants.sql).
--
-- The existing admin read/update policies are left untouched; Postgres
-- OR's policies together, so admins keep full access.
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS business_name text;
COMMENT ON COLUMN public.profiles.phone IS
  'The tutor''s own contact number (business line). Self-service via update_my_profile.';
COMMENT ON COLUMN public.profiles.business_name IS
  'Practice name shown on tutor-facing chrome. Self-service via update_my_profile.';
-- Read your own row (additive; admin policy still applies to admins).
DROP POLICY IF EXISTS "profiles_own_read" ON public.profiles;
CREATE POLICY "profiles_own_read"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());
/** Update ONLY your own name/business/phone. Never role, never billing,
 *  never another row. NULL args leave a field untouched, so a caller
 *  can't blank a field it didn't mean to send. */
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_full_name text DEFAULT NULL,
  p_business_name text DEFAULT NULL,
  p_phone text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- NULL uid = not signed in. Guard explicitly: `id = NULL` is NULL, not
  -- false, and plpgsql would treat the row match as no-op rather than a
  -- refusal — the NULL-guard trap this repo has hit before.
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET full_name     = COALESCE(NULLIF(btrim(p_full_name), ''), full_name),
      business_name = CASE
                        WHEN p_business_name IS NULL THEN business_name
                        ELSE NULLIF(btrim(p_business_name), '')
                      END,
      phone         = CASE
                        WHEN p_phone IS NULL THEN phone
                        ELSE NULLIF(btrim(p_phone), '')
                      END,
      updated_at    = now()
  WHERE id = v_uid;

  RETURN FOUND;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_my_profile(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text) TO authenticated;

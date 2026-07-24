-- ────────────────────────────────────────────────────────────────────
-- Real consent records + real receipts
--
-- THE PROBLEM: /privacy is a PUBLIC page that tells parents
--   "A record of the permissions you've given. Download a receipt."
-- and prints
--   "Receipt ID JLN-<KEY>-4487 · This confirms the consent recorded on
--    your account."
-- 4487 is a hardcoded literal. The page makes ZERO database calls. The
-- consent list is static definitions. So a COPPA surface, on a platform
-- for children, states that it confirms a record it never queries.
--
-- Signup does record a real coppa_consent_at into auth metadata, so
-- consent isn't fictional — but it is a single timestamp on the ACCOUNT,
-- not a per-child, per-policy-version record, and nothing can produce
-- the receipt the page promises. This table is what makes that promise
-- true.
--
-- DESIGN NOTES
--  * receipt_code is generated HERE, server-side, and is unique. A
--    receipt a parent can't hold you to is theater. The point is that
--    they can name one specific record back at you.
--  * Records are APPEND-ONLY. Withdrawal writes withdrawn_at; it never
--    deletes and never rewrites the original grant. "I consented then,
--    I withdrew later" is the whole story a consent log has to tell —
--    an UPDATE that overwrites the grant destroys the evidence the
--    parent is entitled to.
--  * policy_version is stamped on the row, not looked up later. Consent
--    is to the text as it read THAT DAY; if the policy changes, an old
--    row must still say what was agreed to.
-- ────────────────────────────────────────────────────────────────────

/* Human-readable, unambiguous over the phone (no O/0/I/1), and unique.
 * Format: JLN-XXXXXX. Collision risk at this volume is negligible, and
 * the UNIQUE constraint is the real guard — a retry beats a silent dup. */
CREATE OR REPLACE FUNCTION public.generate_receipt_code()
RETURNS text
LANGUAGE plpgsql VOLATILE
AS $$
DECLARE
  alphabet CONSTANT text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN 'JLN-' || out;
END;
$$;
CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_kind text NOT NULL CHECK (consent_kind IN (
    'coppa_parental',    -- guardian consent for a learner under 13
    'data_processing',   -- 13+ learner / adult
    'recap_emails',
    'analytics_cookies'
  )),
  granted boolean NOT NULL,
  policy_version text NOT NULL,
  /** For coppa_parental: the child's FIRST NAME only. The receipt has to
   *  say who it's about, and a first name does that without putting a
   *  child's full identity in a row a parent downloads. */
  granted_for_name text,
  receipt_code text NOT NULL UNIQUE DEFAULT public.generate_receipt_code(),
  created_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz
);
CREATE INDEX IF NOT EXISTS consent_records_user_idx
  ON public.consent_records (user_id, created_at DESC);
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
-- A parent reads their OWN consent. This is the one table where the
-- subject's right to see the row is the entire purpose.
DROP POLICY IF EXISTS "consent read own" ON public.consent_records;
CREATE POLICY "consent read own" ON public.consent_records
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff());
-- Insert only for yourself. Nobody consents on another adult's behalf.
DROP POLICY IF EXISTS "consent insert own" ON public.consent_records;
CREATE POLICY "consent insert own" ON public.consent_records
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
-- No UPDATE policy and no DELETE policy, deliberately: append-only.
-- Withdrawal goes through the function below, which only ever stamps
-- withdrawn_at. There is no path that rewrites a grant.

/** Withdraw a consent. Stamps withdrawn_at on YOUR OWN row and returns
 *  the receipt code so the parent can keep evidence of the withdrawal
 *  itself. Idempotent: withdrawing twice keeps the first timestamp —
 *  the moment they said stop is the fact that matters. */
CREATE OR REPLACE FUNCTION public.withdraw_consent(p_receipt_code text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
BEGIN
  -- INVARIANT: NULL uid must return early. `user_id = NULL` is NULL, not
  -- false, so without this the WHERE silently matches nothing and the
  -- caller can't tell "not signed in" from "no such receipt".
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.consent_records
  SET withdrawn_at = COALESCE(withdrawn_at, now())
  WHERE receipt_code = p_receipt_code
    AND user_id = v_uid          -- INVARIANT: your own row only.
  RETURNING receipt_code INTO v_code;

  RETURN v_code;  -- NULL when it isn't yours or doesn't exist.
END;
$$;
REVOKE EXECUTE ON FUNCTION public.withdraw_consent(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_consent(text) TO authenticated;
-- ────────────────────────────────────────────────────────────────────
-- child_profile_requests — the parent-facing front door
--
-- The design is emphatic, and it is right: "Do not upload school or
-- medical records here." A parent submits STRENGTHS and COMFORT, not
-- clinical data. Alexus reviews and connects it; the clinical form
-- (/tutor/students/new — diagnoses, IEP, sensory load, behavioral)
-- stays tutor-side. This is a REQUEST, never a profile.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.child_profile_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_first_name text NOT NULL CHECK (btrim(child_first_name) <> ''),
  age_band text NOT NULL CHECK (age_band IN ('under_13', '13_17', '18_plus')),
  grade_band text NOT NULL,
  /** "Help us see the learner first" — the design requires this one.
   *  Strengths before deficits is the whole posture of the intake. */
  learning_strengths text NOT NULL CHECK (length(btrim(learning_strengths)) >= 10),
  support_preferences text,
  /** {reduced_motion, larger_text, more_spacing, read_aloud} — maps onto
   *  SensorySettings so the child's first session already fits them. */
  sensory_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_record_id uuid NOT NULL REFERENCES public.consent_records(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'connected', 'declined')),
  linked_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS child_profile_requests_status_idx
  ON public.child_profile_requests (status, created_at DESC);
ALTER TABLE public.child_profile_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "child requests read own" ON public.child_profile_requests;
CREATE POLICY "child requests read own" ON public.child_profile_requests
  FOR SELECT TO authenticated
  USING (parent_user_id = auth.uid() OR public.is_staff());
DROP POLICY IF EXISTS "child requests insert own" ON public.child_profile_requests;
CREATE POLICY "child requests insert own" ON public.child_profile_requests
  FOR INSERT TO authenticated
  WITH CHECK (parent_user_id = auth.uid());
-- Only staff decide a request's fate. A parent cannot self-approve into
-- a student record.
DROP POLICY IF EXISTS "child requests staff review" ON public.child_profile_requests;
CREATE POLICY "child requests staff review" ON public.child_profile_requests
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Security hardening found during the 2026-07-15 adversarial review.
-- This migration is intentionally additive: older environments have the
-- original portal-auth schema, while production also accumulated the later
-- "simple auth" columns. Reconcile on the original, hashed/session-backed
-- model without deleting either environment's existing records.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Migration history on the shared project predates the current schema: the
-- foundation migration is marked applied, but these enum types are absent and
-- student_access_codes still has the older plaintext shape. Recreate only the
-- missing public types before adding the typed columns below.
DO $$
BEGIN
  IF to_regtype('public.access_code_purpose') IS NULL THEN
    CREATE TYPE public.access_code_purpose AS ENUM (
      'starter', 'pin_reset', 'caregiver_recovery'
    );
  END IF;

  IF to_regtype('public.delivery_method') IS NULL THEN
    CREATE TYPE public.delivery_method AS ENUM (
      'email', 'sms', 'print', 'manual'
    );
  END IF;
END
$$;
-- The same history drift left the session-backed tables/functions absent.
-- Rebuild the minimum foundation used by the current server actions. The
-- legacy student_credentials row is intentionally not copied: its SHA-256
-- PIN cannot be converted to bcrypt without the plaintext PIN, so the one
-- existing test student must use a fresh starter code.
CREATE TABLE IF NOT EXISTS public.student_portal_credentials (
  student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  pin_hash text,
  pin_set_at timestamptz,
  last_login_at timestamptz,
  failed_attempt_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  current_access_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.student_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  access_version integer NOT NULL,
  session_hash text NOT NULL,
  device_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS student_portal_sessions_student_id_idx
  ON public.student_portal_sessions (student_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS student_portal_sessions_active_idx
  ON public.student_portal_sessions (student_id, revoked_at, expires_at DESC);
CREATE TABLE IF NOT EXISTS public.student_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_profile_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_portal_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_access_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_portal_credentials FROM anon, authenticated;
REVOKE ALL ON public.student_portal_sessions FROM anon, authenticated;
REVOKE ALL ON public.student_access_events FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.can_manage_student(target_student_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE s.id = target_student_id
      AND (p.role = 'admin' OR s.created_by_profile_id = auth.uid())
  );
$$;
ALTER TABLE public.student_access_codes
  ADD COLUMN IF NOT EXISTS purpose public.access_code_purpose,
  ADD COLUMN IF NOT EXISTS delivery_method public.delivery_method,
  ADD COLUMN IF NOT EXISTS code_hash text,
  ADD COLUMN IF NOT EXISTS code_label text,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by_profile_id uuid REFERENCES public.profiles(id);
UPDATE public.student_access_codes
SET purpose = COALESCE(purpose, 'starter'::public.access_code_purpose),
    delivery_method = COALESCE(delivery_method, 'manual'::public.delivery_method)
WHERE purpose IS NULL OR delivery_method IS NULL;
-- Environments that briefly stored a plaintext `code` can be upgraded
-- without retaining another plaintext copy in the portal flow.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'student_access_codes'
      AND column_name = 'code'
  ) THEN
    EXECUTE $sql$
      UPDATE public.student_access_codes
      SET code_hash = extensions.crypt(code, extensions.gen_salt('bf'))
      WHERE code_hash IS NULL AND code IS NOT NULL
    $sql$;
  END IF;
END
$$;
ALTER TABLE public.student_access_codes
  ALTER COLUMN purpose SET NOT NULL,
  ALTER COLUMN delivery_method SET NOT NULL,
  ALTER COLUMN code_hash SET NOT NULL,
  DROP COLUMN IF EXISTS code;
-- Remove the unrestricted policies introduced by the simple-auth migration.
DROP POLICY IF EXISTS "Tutors manage credentials" ON public.student_credentials;
DROP POLICY IF EXISTS "Students auth via credentials" ON public.student_credentials;
DROP POLICY IF EXISTS "Tutors manage access codes" ON public.student_access_codes;
DROP POLICY IF EXISTS "Students read access codes" ON public.student_access_codes;
DROP POLICY IF EXISTS "Students use access codes" ON public.student_access_codes;
REVOKE ALL ON public.student_credentials FROM anon, authenticated;
REVOKE ALL ON public.student_access_codes FROM anon;
CREATE OR REPLACE FUNCTION public.resolve_student_reference(student_ref text)
RETURNS uuid
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  cleaned text := NULLIF(btrim(student_ref), '');
  resolved uuid;
BEGIN
  IF cleaned IS NULL THEN RETURN NULL; END IF;

  SELECT s.id INTO resolved
  FROM public.students s
  WHERE lower(COALESCE(s.external_student_id, '')) = lower(cleaned)
  LIMIT 1;
  IF resolved IS NOT NULL THEN RETURN resolved; END IF;

  BEGIN
    RETURN cleaned::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN NULL;
  END;
END;
$$;
CREATE OR REPLACE FUNCTION public.hash_portal_secret(secret_value text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT encode(extensions.digest(COALESCE(secret_value, ''), 'sha256'), 'hex');
$$;
CREATE OR REPLACE FUNCTION public.issue_student_portal_session(
  target_student_id uuid,
  client_device_type text DEFAULT NULL
)
RETURNS TABLE (session_token text, session_expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_token text := encode(extensions.gen_random_bytes(24), 'hex');
  current_version integer;
  expiry timestamptz := now() + interval '14 days';
BEGIN
  SELECT c.current_access_version INTO current_version
  FROM public.student_portal_credentials c
  WHERE c.student_id = target_student_id;

  IF current_version IS NULL THEN
    RAISE EXCEPTION 'student credentials not found';
  END IF;

  INSERT INTO public.student_portal_sessions (
    student_id, access_version, session_hash, device_context,
    expires_at, last_seen_at
  ) VALUES (
    target_student_id, current_version, public.hash_portal_secret(raw_token),
    jsonb_build_object('device_type', client_device_type), expiry, now()
  );

  RETURN QUERY SELECT raw_token, expiry;
END;
$$;
-- Tutors receive plaintext only as this RPC result; the database retains a
-- bcrypt hash and a non-secret label.
CREATE OR REPLACE FUNCTION public.generate_student_access_code(
  target_student_id uuid,
  code_purpose public.access_code_purpose DEFAULT 'pin_reset',
  delivery public.delivery_method DEFAULT 'manual',
  minutes_valid integer DEFAULT 60
)
RETURNS TABLE (code_id uuid, plain_code text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester uuid := auth.uid();
  raw_hex text;
  raw_code text;
  new_code_id uuid;
  new_expires_at timestamptz;
BEGIN
  IF requester IS NULL OR NOT public.can_manage_student(target_student_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF minutes_valid < 5 OR minutes_valid > 10080 THEN
    RAISE EXCEPTION 'minutes_valid must be between 5 and 10080';
  END IF;

  UPDATE public.student_access_codes
  SET revoked_at = now()
  WHERE student_id = target_student_id
    AND purpose = code_purpose
    AND revoked_at IS NULL
    AND used_at IS NULL;

  raw_hex := upper(encode(extensions.gen_random_bytes(4), 'hex'));
  raw_code := substr(raw_hex, 1, 4) || '-' || substr(raw_hex, 5, 4);
  new_expires_at := now() + make_interval(mins => minutes_valid);

  INSERT INTO public.student_access_codes (
    student_id, purpose, delivery_method, code_hash, code_label,
    expires_at, created_by_profile_id
  ) VALUES (
    target_student_id, code_purpose, delivery,
    extensions.crypt(raw_code, extensions.gen_salt('bf')),
    upper(code_purpose::text) || ' ' || to_char(now(), 'YYYY-MM-DD HH24:MI'),
    new_expires_at, requester
  ) RETURNING id INTO new_code_id;

  INSERT INTO public.student_access_events (
    student_id, event_type, event_detail, actor_profile_id
  ) VALUES (
    target_student_id, 'access_code_generated',
    jsonb_build_object('purpose', code_purpose, 'delivery_method', delivery,
      'expires_at', new_expires_at), requester
  );

  RETURN QUERY SELECT new_code_id, raw_code, new_expires_at;
END;
$$;
CREATE OR REPLACE FUNCTION public.get_student_access_record(student_ref text)
RETURNS TABLE (
  pin_set_at timestamptz,
  last_login_at timestamptz,
  failed_attempt_count integer,
  locked_until timestamptz,
  latest_active_code_label text,
  latest_active_code_expires_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.pin_set_at, c.last_login_at, c.failed_attempt_count, c.locked_until,
    a.code_label, a.expires_at
  FROM public.students s
  LEFT JOIN public.student_portal_credentials c ON c.student_id = s.id
  LEFT JOIN LATERAL (
    SELECT sac.code_label, sac.expires_at
    FROM public.student_access_codes sac
    WHERE sac.student_id = s.id AND sac.revoked_at IS NULL
      AND sac.used_at IS NULL AND sac.expires_at > now()
    ORDER BY sac.created_at DESC LIMIT 1
  ) a ON true
  WHERE s.id = public.resolve_student_reference(student_ref)
    AND auth.uid() IS NOT NULL
    AND public.can_manage_student(s.id)
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.resolve_student_reference(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hash_portal_secret(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.issue_student_portal_session(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_student_access_code(uuid, public.access_code_purpose, public.delivery_method, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_student_access_code(uuid, public.access_code_purpose, public.delivery_method, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.get_student_access_record(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_access_record(text) TO authenticated;
-- Set a PIN by possession of a one-time starter code. The code lookup and
-- consumption are row-locked, the PIN uses bcrypt, and the returned session
-- token is random with only its hash stored server-side.
CREATE OR REPLACE FUNCTION public.student_portal_set_pin_by_code(
  access_code text,
  new_pin text,
  client_device_type text DEFAULT NULL
)
RETURNS TABLE (
  ok boolean,
  error_code text,
  session_token text,
  session_expires_at timestamptz,
  student_id uuid,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_code public.student_access_codes%ROWTYPE;
  student_row public.students%ROWTYPE;
  next_access_version integer;
  issued record;
BEGIN
  IF COALESCE(new_pin, '') !~ '^[0-9]{4}$' THEN
    RETURN QUERY SELECT false, 'invalid_pin_format', NULL::text,
      NULL::timestamptz, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  SELECT sac.* INTO matched_code
  FROM public.student_access_codes sac
  WHERE sac.code_hash IS NOT NULL
    AND sac.revoked_at IS NULL
    AND sac.used_at IS NULL
    AND sac.expires_at > now()
    AND extensions.crypt(upper(btrim(access_code)), sac.code_hash) = sac.code_hash
  ORDER BY sac.created_at DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'invalid_access_code', NULL::text,
      NULL::timestamptz, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  SELECT * INTO student_row FROM public.students
  WHERE id = matched_code.student_id AND status <> 'archived';
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'invalid_access_code', NULL::text,
      NULL::timestamptz, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  SELECT COALESCE(current_access_version, 0) + 1 INTO next_access_version
  FROM public.student_portal_credentials
  WHERE student_id = student_row.id
  FOR UPDATE;
  next_access_version := COALESCE(next_access_version, 1);

  INSERT INTO public.student_portal_credentials (
    student_id, pin_hash, pin_set_at, last_login_at,
    failed_attempt_count, locked_until, current_access_version
  ) VALUES (
    student_row.id, extensions.crypt(new_pin, extensions.gen_salt('bf')),
    now(), now(), 0, NULL, next_access_version
  )
  ON CONFLICT (student_id) DO UPDATE SET
    pin_hash = EXCLUDED.pin_hash,
    pin_set_at = EXCLUDED.pin_set_at,
    last_login_at = EXCLUDED.last_login_at,
    failed_attempt_count = 0,
    locked_until = NULL,
    current_access_version = EXCLUDED.current_access_version,
    updated_at = now();

  UPDATE public.student_access_codes SET used_at = now()
  WHERE id = matched_code.id;
  UPDATE public.student_portal_sessions SET revoked_at = now()
  WHERE student_id = student_row.id AND revoked_at IS NULL;

  SELECT * INTO issued
  FROM public.issue_student_portal_session(student_row.id, client_device_type);

  RETURN QUERY SELECT true, NULL::text, issued.session_token,
    issued.session_expires_at, student_row.id, student_row.display_name;
END;
$$;
REVOKE ALL ON FUNCTION public.student_portal_set_pin_by_code(text, text, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_portal_set_pin_by_code(text, text, text)
  TO anon, authenticated;
-- Lock the credential row while evaluating and incrementing failures. This
-- closes the parallel-request race in the previous read/modify/write action.
CREATE OR REPLACE FUNCTION public.student_portal_sign_in(
  student_ref text,
  pin text,
  client_device_type text DEFAULT NULL
)
RETURNS TABLE (
  ok boolean, error_code text, session_token text,
  session_expires_at timestamptz, student_id uuid, external_student_id text,
  display_name text, grade_band text, primary_subjects text[], device_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_student_id uuid;
  student_row public.students%ROWTYPE;
  creds public.student_portal_credentials%ROWTYPE;
  issued record;
  next_failed_count integer;
BEGIN
  target_student_id := public.resolve_student_reference(student_ref);
  SELECT * INTO student_row FROM public.students
  WHERE id = target_student_id AND status <> 'archived';
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'invalid_credentials', NULL::text,
      NULL::timestamptz, NULL::uuid, NULL::text, NULL::text, NULL::text,
      NULL::text[], NULL::text;
    RETURN;
  END IF;

  SELECT * INTO creds FROM public.student_portal_credentials
  WHERE student_id = target_student_id FOR UPDATE;
  IF NOT FOUND OR creds.pin_hash IS NULL THEN
    RETURN QUERY SELECT false, 'invalid_credentials', NULL::text,
      NULL::timestamptz, NULL::uuid, NULL::text, NULL::text, NULL::text,
      NULL::text[], NULL::text;
    RETURN;
  END IF;

  IF creds.locked_until IS NOT NULL AND creds.locked_until > now() THEN
    RETURN QUERY SELECT false, 'temporarily_locked', NULL::text,
      creds.locked_until, student_row.id, student_row.external_student_id,
      student_row.display_name, student_row.grade_band,
      student_row.primary_subjects, student_row.device_type;
    RETURN;
  END IF;

  IF extensions.crypt(pin, creds.pin_hash) <> creds.pin_hash THEN
    next_failed_count := COALESCE(creds.failed_attempt_count, 0) + 1;
    UPDATE public.student_portal_credentials SET
      failed_attempt_count = next_failed_count,
      locked_until = CASE WHEN next_failed_count >= 5
        THEN now() + interval '15 minutes' ELSE NULL END,
      updated_at = now()
    WHERE student_id = target_student_id;
    RETURN QUERY SELECT false,
      CASE WHEN next_failed_count >= 5 THEN 'temporarily_locked'
           ELSE 'invalid_pin' END,
      NULL::text,
      CASE WHEN next_failed_count >= 5 THEN now() + interval '15 minutes'
           ELSE NULL::timestamptz END,
      student_row.id, student_row.external_student_id,
      student_row.display_name, student_row.grade_band,
      student_row.primary_subjects, student_row.device_type;
    RETURN;
  END IF;

  UPDATE public.student_portal_credentials SET failed_attempt_count = 0,
    locked_until = NULL, last_login_at = now(), updated_at = now()
  WHERE student_id = target_student_id;
  SELECT * INTO issued
  FROM public.issue_student_portal_session(target_student_id, client_device_type);
  RETURN QUERY SELECT true, NULL::text, issued.session_token,
    issued.session_expires_at, student_row.id, student_row.external_student_id,
    student_row.display_name, student_row.grade_band,
    student_row.primary_subjects, student_row.device_type;
END;
$$;
REVOKE ALL ON FUNCTION public.student_portal_sign_in(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_portal_sign_in(text, text, text)
  TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.get_student_portal_session(
  student_ref text,
  session_token text
)
RETURNS TABLE (
  ok boolean,
  student_id uuid,
  external_student_id text,
  first_name text,
  display_name text,
  grade_band text,
  primary_subjects text[],
  device_type text,
  last_login_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_student_id uuid := public.resolve_student_reference(student_ref);
  session_row public.student_portal_sessions%ROWTYPE;
  creds public.student_portal_credentials%ROWTYPE;
  student_row public.students%ROWTYPE;
BEGIN
  IF target_student_id IS NULL OR COALESCE(session_token, '') = '' THEN RETURN; END IF;

  SELECT * INTO session_row
  FROM public.student_portal_sessions sps
  WHERE sps.student_id = target_student_id
    AND sps.session_hash = public.hash_portal_secret(session_token)
    AND sps.revoked_at IS NULL
    AND sps.expires_at > now()
  ORDER BY sps.created_at DESC
  LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO creds FROM public.student_portal_credentials
  WHERE student_id = target_student_id;
  IF NOT FOUND OR creds.current_access_version <> session_row.access_version THEN RETURN; END IF;

  SELECT * INTO student_row FROM public.students
  WHERE id = target_student_id AND status <> 'archived';
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.student_portal_sessions SET last_seen_at = now()
  WHERE id = session_row.id;

  RETURN QUERY SELECT true, student_row.id, student_row.external_student_id,
    student_row.first_name, student_row.display_name, student_row.grade_band,
    student_row.primary_subjects, student_row.device_type, creds.last_login_at;
END;
$$;
CREATE OR REPLACE FUNCTION public.student_portal_sign_out(
  student_ref text,
  session_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_student_id uuid := public.resolve_student_reference(student_ref);
BEGIN
  IF target_student_id IS NULL OR COALESCE(session_token, '') = '' THEN RETURN false; END IF;

  UPDATE public.student_portal_sessions
  SET revoked_at = now()
  WHERE student_id = target_student_id
    AND session_hash = public.hash_portal_secret(session_token)
    AND revoked_at IS NULL;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.get_student_portal_session(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_portal_session(text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.student_portal_sign_out(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_portal_sign_out(text, text) TO anon, authenticated;
-- Diagnostic student data is no longer a public table API. Student-facing
-- access must go through a verified portal session in application code/RPCs.
DROP POLICY IF EXISTS "Students read their attempts" ON public.diagnostic_attempts;
DROP POLICY IF EXISTS "Students can complete their attempts" ON public.diagnostic_attempts;
DROP POLICY IF EXISTS "Tutors manage diagnostic responses" ON public.diagnostic_responses;
DROP POLICY IF EXISTS "Students manage diagnostic responses" ON public.diagnostic_responses;
DROP POLICY IF EXISTS "Skill gaps are readable" ON public.diagnostic_skill_gaps;
DROP POLICY IF EXISTS "Questions are readable by all" ON public.diagnostic_questions;
CREATE POLICY "staff read diagnostic questions" ON public.diagnostic_questions
  FOR SELECT TO authenticated USING (public.is_staff());
DROP POLICY IF EXISTS "Tutors manage session diagnostic links" ON public.session_diagnostic_links;
CREATE POLICY "staff manage session diagnostic links" ON public.session_diagnostic_links
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "staff manage diagnostic responses" ON public.diagnostic_responses
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "staff manage diagnostic skill gaps" ON public.diagnostic_skill_gaps
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
-- The reviewed student learning surfaces now read/write through the verified
-- portal session and a server-only client, so the anon Data API no longer
-- needs broad row access.
DROP POLICY IF EXISTS "Students manage their progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Students manage their highlights" ON public.text_highlights;
DROP POLICY IF EXISTS "Students submit quiz responses" ON public.quiz_responses;
DROP POLICY IF EXISTS "Students read their library" ON public.student_library_items;
DROP POLICY IF EXISTS "Students manage game favorites" ON public.student_game_favorites;
DROP POLICY IF EXISTS "Students manage their settings" ON public.student_settings;
DROP POLICY IF EXISTS "Students read curriculum assignments" ON public.curriculum_assignments;
DROP POLICY IF EXISTS "Open read sensory settings" ON public.student_sensory_settings;
DROP POLICY IF EXISTS "Open insert sensory settings" ON public.student_sensory_settings;
DROP POLICY IF EXISTS "Open update sensory settings" ON public.student_sensory_settings;
DROP POLICY IF EXISTS "Anyone can append mood checkins" ON public.mood_checkins;
DROP POLICY IF EXISTS "Authenticated tutors read mood checkins" ON public.mood_checkins;
CREATE POLICY "staff read mood checkins" ON public.mood_checkins
  FOR SELECT TO authenticated USING (public.is_staff());
DROP POLICY IF EXISTS "Anyone can append prompt events" ON public.prompt_events;
DROP POLICY IF EXISTS "Authenticated tutors read prompt events" ON public.prompt_events;
CREATE POLICY "staff read prompt events" ON public.prompt_events
  FOR SELECT TO authenticated USING (public.is_staff());
DROP POLICY IF EXISTS "Anyone can read reinforcement dials" ON public.student_reinforcement_dials;
DROP POLICY IF EXISTS "Authenticated tutors write reinforcement dials" ON public.student_reinforcement_dials;
DROP POLICY IF EXISTS "Authenticated tutors update reinforcement dials" ON public.student_reinforcement_dials;
CREATE POLICY "staff manage reinforcement dials" ON public.student_reinforcement_dials
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
-- Auto-rep writes now come from the verified server boundary too; callers
-- holding only the anon key can no longer award reps for a guessed UUID.
REVOKE EXECUTE ON FUNCTION public.record_student_habit_reps(uuid, text)
  FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_student_habit_reps(uuid, text)
  TO service_role;
-- Goal + habits are one form submission and now one database transaction.
CREATE OR REPLACE FUNCTION public.create_goal_with_habits(
  p_student_id uuid,
  p_goal jsonb,
  p_habits jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_goal_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff()
     OR NOT public.can_manage_student(p_student_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF jsonb_typeof(p_habits) <> 'array' OR jsonb_array_length(p_habits) > 3 THEN
    RAISE EXCEPTION 'pick up to 3 habits';
  END IF;

  INSERT INTO public.student_goals (
    student_id, goal_type, title, kid_title, unit, baseline_value,
    current_value, target_value, target_date, why, why_shared,
    agreement_witnessed_at, created_by
  ) VALUES (
    p_student_id, p_goal->>'goal_type', btrim(p_goal->>'title'),
    NULLIF(btrim(p_goal->>'kid_title'), ''), btrim(p_goal->>'unit'),
    (p_goal->>'baseline_value')::numeric,
    (p_goal->>'current_value')::numeric,
    (p_goal->>'target_value')::numeric,
    NULLIF(p_goal->>'target_date', '')::date,
    NULLIF(btrim(p_goal->>'why'), ''),
    COALESCE((p_goal->>'why_shared')::boolean, false),
    CASE WHEN COALESCE((p_goal->>'witnessed')::boolean, false) THEN now() END,
    auth.uid()
  ) RETURNING id INTO new_goal_id;

  INSERT INTO public.goal_habits (
    goal_id, student_id, title, kid_title, cadence, rep_source,
    home_habit, parent_note
  )
  SELECT new_goal_id, p_student_id, btrim(h->>'title'),
    NULLIF(btrim(h->>'kid_title'), ''), h->>'cadence', h->>'rep_source',
    COALESCE((h->>'home_habit')::boolean, false),
    NULLIF(btrim(h->>'parent_note'), '')
  FROM jsonb_array_elements(p_habits) AS h
  WHERE NULLIF(btrim(h->>'title'), '') IS NOT NULL;

  RETURN new_goal_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_goal_with_habits(uuid, jsonb, jsonb)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_goal_with_habits(uuid, jsonb, jsonb)
  TO authenticated;

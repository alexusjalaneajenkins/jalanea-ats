-- PL/pgSQL output columns are variables. Qualify table columns that share the
-- `student_id` name or PostgreSQL raises "column reference is ambiguous" at
-- runtime even though CREATE FUNCTION succeeds.

CREATE OR REPLACE FUNCTION public.student_portal_set_pin_by_code(
  access_code text,
  new_pin text,
  client_device_type text DEFAULT NULL
)
RETURNS TABLE (
  ok boolean, error_code text, session_token text,
  session_expires_at timestamptz, student_id uuid, display_name text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
  WHERE sac.code_hash IS NOT NULL AND sac.revoked_at IS NULL
    AND sac.used_at IS NULL AND sac.expires_at > now()
    AND extensions.crypt(upper(btrim(access_code)), sac.code_hash) = sac.code_hash
  ORDER BY sac.created_at DESC LIMIT 1 FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'invalid_access_code', NULL::text,
      NULL::timestamptz, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  SELECT * INTO student_row FROM public.students s
  WHERE s.id = matched_code.student_id AND s.status <> 'archived';
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'invalid_access_code', NULL::text,
      NULL::timestamptz, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  SELECT COALESCE(spc.current_access_version, 0) + 1 INTO next_access_version
  FROM public.student_portal_credentials spc
  WHERE spc.student_id = student_row.id FOR UPDATE;
  next_access_version := COALESCE(next_access_version, 1);

  INSERT INTO public.student_portal_credentials (
    student_id, pin_hash, pin_set_at, last_login_at,
    failed_attempt_count, locked_until, current_access_version
  ) VALUES (
    student_row.id, extensions.crypt(new_pin, extensions.gen_salt('bf')),
    now(), now(), 0, NULL, next_access_version
  )
  ON CONFLICT ON CONSTRAINT student_portal_credentials_pkey DO UPDATE SET
    pin_hash = EXCLUDED.pin_hash, pin_set_at = EXCLUDED.pin_set_at,
    last_login_at = EXCLUDED.last_login_at, failed_attempt_count = 0,
    locked_until = NULL,
    current_access_version = EXCLUDED.current_access_version,
    updated_at = now();

  UPDATE public.student_access_codes sac SET used_at = now()
  WHERE sac.id = matched_code.id;
  UPDATE public.student_portal_sessions sps SET revoked_at = now()
  WHERE sps.student_id = student_row.id AND sps.revoked_at IS NULL;

  SELECT * INTO issued
  FROM public.issue_student_portal_session(student_row.id, client_device_type);
  RETURN QUERY SELECT true, NULL::text, issued.session_token,
    issued.session_expires_at, student_row.id, student_row.display_name;
END;
$$;
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_student_id uuid;
  student_row public.students%ROWTYPE;
  creds public.student_portal_credentials%ROWTYPE;
  issued record;
  next_failed_count integer;
BEGIN
  target_student_id := public.resolve_student_reference(student_ref);
  SELECT * INTO student_row FROM public.students s
  WHERE s.id = target_student_id AND s.status <> 'archived';
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'invalid_credentials', NULL::text,
      NULL::timestamptz, NULL::uuid, NULL::text, NULL::text, NULL::text,
      NULL::text[], NULL::text;
    RETURN;
  END IF;

  SELECT * INTO creds FROM public.student_portal_credentials spc
  WHERE spc.student_id = target_student_id FOR UPDATE;
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
    UPDATE public.student_portal_credentials spc SET
      failed_attempt_count = next_failed_count,
      locked_until = CASE WHEN next_failed_count >= 5
        THEN now() + interval '15 minutes' ELSE NULL END,
      updated_at = now()
    WHERE spc.student_id = target_student_id;
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

  UPDATE public.student_portal_credentials spc SET failed_attempt_count = 0,
    locked_until = NULL, last_login_at = now(), updated_at = now()
  WHERE spc.student_id = target_student_id;
  SELECT * INTO issued
  FROM public.issue_student_portal_session(target_student_id, client_device_type);
  RETURN QUERY SELECT true, NULL::text, issued.session_token,
    issued.session_expires_at, student_row.id, student_row.external_student_id,
    student_row.display_name, student_row.grade_band,
    student_row.primary_subjects, student_row.device_type;
END;
$$;
CREATE OR REPLACE FUNCTION public.get_student_portal_session(
  student_ref text,
  session_token text
)
RETURNS TABLE (
  ok boolean, student_id uuid, external_student_id text, first_name text,
  display_name text, grade_band text, primary_subjects text[], device_type text,
  last_login_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_student_id uuid := public.resolve_student_reference(student_ref);
  session_row public.student_portal_sessions%ROWTYPE;
  creds public.student_portal_credentials%ROWTYPE;
  student_row public.students%ROWTYPE;
BEGIN
  IF target_student_id IS NULL OR COALESCE(session_token, '') = '' THEN RETURN; END IF;

  SELECT * INTO session_row FROM public.student_portal_sessions sps
  WHERE sps.student_id = target_student_id
    AND sps.session_hash = public.hash_portal_secret(session_token)
    AND sps.revoked_at IS NULL AND sps.expires_at > now()
  ORDER BY sps.created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO creds FROM public.student_portal_credentials spc
  WHERE spc.student_id = target_student_id;
  IF NOT FOUND OR creds.current_access_version <> session_row.access_version THEN RETURN; END IF;

  SELECT * INTO student_row FROM public.students s
  WHERE s.id = target_student_id AND s.status <> 'archived';
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.student_portal_sessions sps SET last_seen_at = now()
  WHERE sps.id = session_row.id;
  RETURN QUERY SELECT true, student_row.id, student_row.external_student_id,
    student_row.first_name, student_row.display_name, student_row.grade_band,
    student_row.primary_subjects, student_row.device_type, creds.last_login_at;
END;
$$;
REVOKE ALL ON FUNCTION public.student_portal_set_pin_by_code(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_portal_set_pin_by_code(text, text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.student_portal_sign_in(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_portal_sign_in(text, text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_student_portal_session(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_portal_session(text, text) TO anon, authenticated;

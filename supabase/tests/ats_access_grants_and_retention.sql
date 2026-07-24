\set ON_ERROR_STOP on

-- Run only after applying 20260724131313_ats_access_grants_and_retention.sql to
-- a disposable/local database:
--   psql "$DATABASE_URL" \
--     -f supabase/tests/ats_access_grants_and_retention.sql
--
-- The transaction rolls back. It verifies service-only privileges and the
-- behavioral contract without retaining the synthetic user or counter rows.

BEGIN;

DO $verification$
DECLARE
  v_function_signature TEXT;
  v_function_oid OID;
  v_function_owner OID;
  v_function_acl ACLITEM[];
  v_function_config TEXT[];
  v_is_security_definer BOOLEAN;
  v_definition TEXT;
  v_user_id UUID := gen_random_uuid();
  v_deleted_grants INTEGER;
  v_grant_rejected BOOLEAN := FALSE;
BEGIN
  IF pg_catalog.to_regclass('public.ats_access_grants') IS NULL THEN
    RAISE EXCEPTION
      'verification failed: public.ats_access_grants is missing';
  END IF;

  IF NOT (
    SELECT relation.relrowsecurity
    FROM pg_catalog.pg_class AS relation
    WHERE relation.oid = 'public.ats_access_grants'::pg_catalog.regclass
  )
     OR NOT (
       SELECT relation.relforcerowsecurity
       FROM pg_catalog.pg_class AS relation
       WHERE relation.oid = 'public.ats_access_grants'::pg_catalog.regclass
     ) THEN
    RAISE EXCEPTION
      'verification failed: access-grant RLS is not enabled and forced';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy AS policy
    WHERE policy.polrelid =
      'public.ats_access_grants'::pg_catalog.regclass
  ) THEN
    RAISE EXCEPTION
      'verification failed: service-only access grants have a client policy';
  END IF;

  IF pg_catalog.has_table_privilege(
       'anon', 'public.ats_access_grants', 'SELECT'
     )
     OR pg_catalog.has_table_privilege(
       'anon', 'public.ats_access_grants', 'INSERT'
     )
     OR pg_catalog.has_table_privilege(
       'anon', 'public.ats_access_grants', 'UPDATE'
     )
     OR pg_catalog.has_table_privilege(
       'anon', 'public.ats_access_grants', 'DELETE'
     )
     OR pg_catalog.has_table_privilege(
       'anon', 'public.ats_access_grants', 'TRUNCATE'
     )
     OR pg_catalog.has_table_privilege(
       'anon', 'public.ats_access_grants', 'REFERENCES'
     )
     OR pg_catalog.has_table_privilege(
       'anon', 'public.ats_access_grants', 'TRIGGER'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated', 'public.ats_access_grants', 'SELECT'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated', 'public.ats_access_grants', 'INSERT'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated', 'public.ats_access_grants', 'UPDATE'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated', 'public.ats_access_grants', 'DELETE'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated', 'public.ats_access_grants', 'TRUNCATE'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated', 'public.ats_access_grants', 'REFERENCES'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated', 'public.ats_access_grants', 'TRIGGER'
     )
     OR NOT pg_catalog.has_table_privilege(
       'service_role', 'public.ats_access_grants', 'SELECT'
     )
     OR NOT pg_catalog.has_table_privilege(
       'service_role', 'public.ats_access_grants', 'INSERT'
     )
     OR NOT pg_catalog.has_table_privilege(
       'service_role', 'public.ats_access_grants', 'UPDATE'
     )
     OR NOT pg_catalog.has_table_privilege(
       'service_role', 'public.ats_access_grants', 'DELETE'
     )
     OR pg_catalog.has_table_privilege(
       'service_role', 'public.ats_access_grants', 'TRUNCATE'
     )
     OR pg_catalog.has_table_privilege(
       'service_role', 'public.ats_access_grants', 'REFERENCES'
     )
     OR pg_catalog.has_table_privilege(
       'service_role', 'public.ats_access_grants', 'TRIGGER'
     )
     OR EXISTS (
       SELECT 1
       FROM pg_catalog.pg_class AS relation
       CROSS JOIN LATERAL pg_catalog.aclexplode(
         COALESCE(
           relation.relacl,
           pg_catalog.acldefault('r', relation.relowner)
         )
       ) AS privilege
       WHERE relation.oid =
         'public.ats_access_grants'::pg_catalog.regclass
         AND privilege.grantee = 0
     ) THEN
    RAISE EXCEPTION
      'verification failed: access-grant table privileges are incorrect';
  END IF;

  FOREACH v_function_signature IN ARRAY ARRAY[
    'public.has_valid_ats_access_grant(uuid)',
    'public.has_active_access(uuid)',
    'public.guard_ats_access_grant_mutation()',
    'public.complete_ats_account_deletion(uuid)',
    'public.prune_ats_retention(date,timestamptz,integer)'
  ] LOOP
    v_function_oid :=
      pg_catalog.to_regprocedure(v_function_signature);

    IF v_function_oid IS NULL THEN
      RAISE EXCEPTION
        'verification failed: function % is missing',
        v_function_signature;
    END IF;

    SELECT
      function_record.proowner,
      function_record.proacl,
      function_record.proconfig,
      function_record.prosecdef
    INTO
      v_function_owner,
      v_function_acl,
      v_function_config,
      v_is_security_definer
    FROM pg_catalog.pg_proc AS function_record
    WHERE function_record.oid = v_function_oid;

    IF v_is_security_definer THEN
      RAISE EXCEPTION
        'verification failed: % is SECURITY DEFINER',
        v_function_signature;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.unnest(v_function_config) AS setting(value)
      WHERE setting.value IN ('search_path=', 'search_path=""')
    ) THEN
      RAISE EXCEPTION
        'verification failed: % does not have an empty search_path',
        v_function_signature;
    END IF;

    IF NOT pg_catalog.has_function_privilege(
         'service_role', v_function_oid, 'EXECUTE'
       )
       OR pg_catalog.has_function_privilege(
         'anon', v_function_oid, 'EXECUTE'
       )
       OR pg_catalog.has_function_privilege(
         'authenticated', v_function_oid, 'EXECUTE'
       )
       OR EXISTS (
         SELECT 1
         FROM pg_catalog.aclexplode(
           COALESCE(
             v_function_acl,
             pg_catalog.acldefault('f', v_function_owner)
           )
         ) AS privilege
         WHERE privilege.grantee = 0
           AND privilege.privilege_type = 'EXECUTE'
       ) THEN
      RAISE EXCEPTION
        'verification failed: execution grants are incorrect for %',
        v_function_signature;
    END IF;
  END LOOP;

  IF NOT pg_catalog.has_table_privilege(
       'service_role', 'public.free_tier_usage', 'DELETE'
     )
     OR NOT pg_catalog.has_table_privilege(
       'service_role', 'public.ai_rate_limits', 'DELETE'
     ) THEN
    RAISE EXCEPTION
      'verification failed: retention tables lack service-role DELETE';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS trigger_record
    WHERE trigger_record.tgrelid =
      'public.ats_access_grants'::pg_catalog.regclass
      AND trigger_record.tgname =
        'ats_access_grants_guard_membership'
      AND NOT trigger_record.tgisinternal
  ) THEN
    RAISE EXCEPTION
      'verification failed: access-grant lifecycle guard is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_indexes AS index_record
    WHERE index_record.schemaname = 'public'
      AND index_record.tablename = 'ai_rate_limits'
      AND index_record.indexname = 'ai_rate_limits_window_start_idx'
  ) THEN
    RAISE EXCEPTION
      'verification failed: retention window index is missing';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('public.has_active_access(uuid)')
  )
  INTO v_definition;

  -- This also proves that merely possessing the former owner email cannot
  -- grant access: neither email nor auth.users participates in the decision.
  IF v_definition ILIKE '%email%'
     OR v_definition ILIKE '%auth.users%'
     OR v_definition NOT ILIKE '%has_valid_ats_access_grant%'
     OR v_definition NOT ILIKE '%ats_memberships%'
     OR v_definition NOT ILIKE '%membership.status <> ''active''%' THEN
    RAISE EXCEPTION
      'verification failed: access is not UUID/grant/tombstone based';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure(
      'public.has_valid_ats_access_grant(uuid)'
    )
  )
  INTO v_definition;

  IF v_definition ILIKE '%email%'
     OR v_definition ILIKE '%auth.users%'
     OR v_definition NOT ILIKE '%ats_access_grants%'
     OR v_definition NOT ILIKE '%expires_at > now()%'
     OR v_definition NOT ILIKE '%status = ''active''%' THEN
    RAISE EXCEPTION
      'verification failed: UUID grant validity is not status/expiry based';
  END IF;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'ats-access-' || v_user_id::TEXT || '@example.invalid',
    '',
    NOW(),
    '{"provider":"email","providers":["email"]}'::JSONB,
    '{}'::JSONB,
    NOW(),
    NOW()
  );

  INSERT INTO public.ats_memberships (user_id, status)
  VALUES (v_user_id, 'active');

  IF public.has_active_access(v_user_id) THEN
    RAISE EXCEPTION
      'verification failed: an email-bearing user without a grant has access';
  END IF;

  INSERT INTO public.ats_access_grants (
    user_id,
    status,
    expires_at,
    reason
  )
  VALUES (
    v_user_id,
    'active',
    NOW() + INTERVAL '1 day',
    'automated verifier'
  );

  IF NOT public.has_active_access(v_user_id) THEN
    RAISE EXCEPTION
      'verification failed: a valid UUID grant does not provide access';
  END IF;

  UPDATE public.ats_access_grants
  SET expires_at = NOW() - INTERVAL '1 second'
  WHERE user_id = v_user_id;

  IF public.has_active_access(v_user_id) THEN
    RAISE EXCEPTION
      'verification failed: an expired grant provides access';
  END IF;

  UPDATE public.ats_access_grants
  SET
    status = 'revoked',
    revoked_at = NOW(),
    expires_at = NULL
  WHERE user_id = v_user_id;

  IF public.has_active_access(v_user_id) THEN
    RAISE EXCEPTION
      'verification failed: a revoked grant provides access';
  END IF;

  UPDATE public.ats_access_grants
  SET
    status = 'active',
    revoked_at = NULL,
    expires_at = NOW() + INTERVAL '1 day'
  WHERE user_id = v_user_id;

  UPDATE public.ats_memberships
  SET status = 'deleting'
  WHERE user_id = v_user_id;

  IF public.has_active_access(v_user_id) THEN
    RAISE EXCEPTION
      'verification failed: deleting membership does not override grant';
  END IF;

  SELECT cleanup.deleted_access_grants
  INTO v_deleted_grants
  FROM public.complete_ats_account_deletion(v_user_id) AS cleanup;

  IF v_deleted_grants <> 1
     OR EXISTS (
       SELECT 1
       FROM public.ats_access_grants AS access_grant
       WHERE access_grant.user_id = v_user_id
     )
     OR EXISTS (
       SELECT 1
       FROM public.ats_memberships AS membership
       WHERE membership.user_id = v_user_id
         AND membership.status <> 'deleted'
     )
     OR public.has_active_access(v_user_id) THEN
    RAISE EXCEPTION
      'verification failed: account deletion did not remove access grant';
  END IF;

  BEGIN
    INSERT INTO public.ats_access_grants (
      user_id,
      status,
      expires_at,
      reason
    )
    VALUES (
      v_user_id,
      'active',
      NOW() + INTERVAL '1 day',
      'must not reactivate'
    );
  EXCEPTION
    WHEN OTHERS THEN
      v_grant_rejected :=
        SQLERRM = 'ATS access grants require an active ATS membership';
  END;

  IF NOT v_grant_rejected
     OR public.has_active_access(v_user_id) THEN
    RAISE EXCEPTION
      'verification failed: deleted membership regained grant access';
  END IF;

  INSERT INTO public.free_tier_usage (ip_hash, usage_date, count)
  VALUES
    ('ats-retention-verifier-old-free-1', DATE '2000-01-01', 1),
    ('ats-retention-verifier-old-free-2', DATE '2000-01-01', 1),
    ('ats-retention-verifier-old-free-3', DATE '2000-01-01', 1),
    ('ats-retention-verifier-current-free', CURRENT_DATE, 1);

  INSERT INTO public.ai_rate_limits (
    bucket,
    window_start,
    count,
    identity_kind
  )
  VALUES
    (
      'ats-retention-verifier-old-ai-1',
      TIMESTAMPTZ '2000-01-01 00:00:00+00',
      1,
      'anonymous'
    ),
    (
      'ats-retention-verifier-old-ai-2',
      TIMESTAMPTZ '2000-01-01 00:00:00+00',
      1,
      'anonymous'
    ),
    (
      'ats-retention-verifier-old-ai-3',
      TIMESTAMPTZ '2000-01-01 00:00:00+00',
      1,
      'anonymous'
    ),
    (
      'ats-retention-verifier-current-ai',
      NOW(),
      1,
      'anonymous'
    );
END;
$verification$;

SET LOCAL ROLE service_role;

DO $retention_verification$
DECLARE
  v_deleted_free INTEGER;
  v_deleted_ai INTEGER;
  v_free_more BOOLEAN;
  v_ai_more BOOLEAN;
  v_started_at TIMESTAMPTZ := pg_catalog.clock_timestamp();
BEGIN
  SELECT
    cleanup.deleted_free_tier_usage,
    cleanup.deleted_ai_rate_limits,
    cleanup.free_tier_has_more,
    cleanup.ai_rate_limits_has_more
  INTO
    v_deleted_free,
    v_deleted_ai,
    v_free_more,
    v_ai_more
  FROM public.prune_ats_retention(
    DATE '2001-01-01',
    TIMESTAMPTZ '2001-01-01 00:00:00+00',
    2
  ) AS cleanup;

  IF v_deleted_free <> 2
     OR v_deleted_ai <> 2
     OR NOT v_free_more
     OR NOT v_ai_more THEN
    RAISE EXCEPTION
      'verification failed: first retention batch was not bounded';
  END IF;

  SELECT
    cleanup.deleted_free_tier_usage,
    cleanup.deleted_ai_rate_limits,
    cleanup.free_tier_has_more,
    cleanup.ai_rate_limits_has_more
  INTO
    v_deleted_free,
    v_deleted_ai,
    v_free_more,
    v_ai_more
  FROM public.prune_ats_retention(
    DATE '2001-01-01',
    TIMESTAMPTZ '2001-01-01 00:00:00+00',
    2
  ) AS cleanup;

  IF v_deleted_free <> 1
     OR v_deleted_ai <> 1
     OR v_free_more
     OR v_ai_more THEN
    RAISE EXCEPTION
      'verification failed: second retention batch missed backlog';
  END IF;

  SELECT
    cleanup.deleted_free_tier_usage,
    cleanup.deleted_ai_rate_limits,
    cleanup.free_tier_has_more,
    cleanup.ai_rate_limits_has_more
  INTO
    v_deleted_free,
    v_deleted_ai,
    v_free_more,
    v_ai_more
  FROM public.prune_ats_retention(
    DATE '2001-01-01',
    TIMESTAMPTZ '2001-01-01 00:00:00+00',
    2
  ) AS cleanup;

  IF v_deleted_free <> 0
     OR v_deleted_ai <> 0
     OR v_free_more
     OR v_ai_more
     OR NOT EXISTS (
       SELECT 1
       FROM public.free_tier_usage
       WHERE ip_hash = 'ats-retention-verifier-current-free'
     )
     OR NOT EXISTS (
       SELECT 1
       FROM public.ai_rate_limits
       WHERE bucket = 'ats-retention-verifier-current-ai'
     )
     OR pg_catalog.clock_timestamp() - v_started_at
       >= INTERVAL '30 seconds' THEN
    RAISE EXCEPTION
      'verification failed: repeated retention cleanup is not safe';
  END IF;
END;
$retention_verification$;

RESET ROLE;

ROLLBACK;

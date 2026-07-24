\set ON_ERROR_STOP on

-- Run after applying 20260723104448_harden_profile_update_privileges.sql to a
-- disposable/local database:
--   psql "$DATABASE_URL" -f supabase/tests/harden_profile_update_privileges.sql
--
-- No credentials are embedded in this file. The transaction is read-only and
-- rolls back. The final authenticated-client acceptance steps are documented
-- below because they require a disposable Supabase Auth user/session.

BEGIN;
SET TRANSACTION READ ONLY;

DO $verification$
DECLARE
  v_function_oid oid;
  v_function_owner oid;
  v_function_acl aclitem[];
  v_function_config text[];
  v_is_security_definer boolean;
  v_unexpected_count integer;
BEGIN
  IF pg_catalog.to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'verification failed: public.profiles does not exist';
  END IF;

  SELECT pg_proc.oid,
         pg_proc.proowner,
         pg_proc.proacl,
         pg_proc.proconfig,
         pg_proc.prosecdef
  INTO v_function_oid,
       v_function_owner,
       v_function_acl,
       v_function_config,
       v_is_security_definer
  FROM pg_catalog.pg_proc
  WHERE pg_proc.oid = pg_catalog.to_regprocedure(
    'public.update_my_profile(text,text,text)'
  );

  IF v_function_oid IS NULL THEN
    RAISE EXCEPTION
      'verification failed: update_my_profile(text,text,text) does not exist';
  END IF;

  SELECT pg_catalog.count(*)
  INTO v_unexpected_count
  FROM pg_catalog.pg_policy
  WHERE pg_policy.polrelid = 'public.profiles'::pg_catalog.regclass
    AND pg_policy.polname IN (
      'Users can update own profile',
      'profiles_self_update'
    );

  IF v_unexpected_count <> 0 THEN
    RAISE EXCEPTION
      'verification failed: broad self-update profile policies remain';
  END IF;

  IF pg_catalog.has_table_privilege(
       'anon', 'public.profiles', 'UPDATE'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated', 'public.profiles', 'UPDATE'
     ) THEN
    RAISE EXCEPTION
      'verification failed: anon/authenticated retains table UPDATE';
  END IF;

  SELECT pg_catalog.count(*)
  INTO v_unexpected_count
  FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = 'public.profiles'::pg_catalog.regclass
    AND attribute.attnum > 0
    AND NOT attribute.attisdropped
    AND (
      pg_catalog.has_column_privilege(
        'anon',
        'public.profiles',
        attribute.attname,
        'UPDATE'
      )
      OR pg_catalog.has_column_privilege(
        'authenticated',
        'public.profiles',
        attribute.attname,
        'UPDATE'
      )
    );

  IF v_unexpected_count <> 0 THEN
    RAISE EXCEPTION
      'verification failed: anon/authenticated retains column UPDATE';
  END IF;

  SELECT pg_catalog.count(*)
  INTO v_unexpected_count
  FROM pg_catalog.aclexplode(
    COALESCE(
      (
        SELECT pg_class.relacl
        FROM pg_catalog.pg_class
        WHERE pg_class.oid = 'public.profiles'::pg_catalog.regclass
      ),
      pg_catalog.acldefault(
        'r',
        (
          SELECT pg_class.relowner
          FROM pg_catalog.pg_class
          WHERE pg_class.oid = 'public.profiles'::pg_catalog.regclass
        )
      )
    )
  ) AS privilege
  WHERE privilege.grantee = 0
    AND privilege.privilege_type = 'UPDATE';

  IF v_unexpected_count <> 0 THEN
    RAISE EXCEPTION
      'verification failed: PUBLIC retains profile UPDATE';
  END IF;

  IF NOT v_is_security_definer THEN
    RAISE EXCEPTION
      'verification failed: update_my_profile is not SECURITY DEFINER';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.unnest(v_function_config) AS setting(value)
    WHERE setting.value IN ('search_path=', 'search_path=""')
  ) THEN
    RAISE EXCEPTION
      'verification failed: update_my_profile search_path is not empty';
  END IF;

  IF NOT pg_catalog.has_function_privilege(
    'authenticated',
    'public.update_my_profile(text,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION
      'verification failed: authenticated cannot execute update_my_profile';
  END IF;

  IF pg_catalog.has_function_privilege(
       'anon',
       'public.update_my_profile(text,text,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION
      'verification failed: anon can execute update_my_profile';
  END IF;

  SELECT pg_catalog.count(*)
  INTO v_unexpected_count
  FROM pg_catalog.aclexplode(
    COALESCE(
      v_function_acl,
      pg_catalog.acldefault('f', v_function_owner)
    )
  ) AS privilege
  WHERE privilege.privilege_type = 'EXECUTE'
    AND privilege.grantee NOT IN (
      v_function_owner,
      (
        SELECT pg_roles.oid
        FROM pg_catalog.pg_roles
        WHERE pg_roles.rolname = 'authenticated'
      )
    );

  IF v_unexpected_count <> 0 THEN
    RAISE EXCEPTION
      'verification failed: unexpected role can execute update_my_profile';
  END IF;
END;
$verification$;

ROLLBACK;

-- Post-apply acceptance with a disposable normal user (no secrets in source):
-- 1. Sign in as a non-admin user and attempt:
--      supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id)
--    Expected: PostgreSQL/PostgREST permission failure; role remains unchanged.
-- 2. As that same user call:
--      supabase.rpc('update_my_profile', { p_full_name: 'Updated Name' })
--    Expected: true, only the user's allowed contact fields/updated_at change.
-- 3. Sign out and call update_my_profile through the anon client.
--    Expected: permission failure before the function body executes.

-- Close the profile self-update privilege-escalation path.
--
-- Normal users must not receive UPDATE on public.profiles because RLS limits
-- rows, not columns. Contact-field edits go through update_my_profile(), whose
-- body has an explicit column allowlist. Existing admin/server role-management
-- functions are intentionally left untouched.

DO $migration$
DECLARE
  v_column name;
BEGIN
  IF pg_catalog.to_regclass('public.profiles') IS NULL THEN
    RAISE NOTICE 'public.profiles is absent; profile privilege hardening skipped';
    RETURN;
  END IF;

  -- Revoke both table-level and any historical column-level UPDATE grants.
  EXECUTE
    'REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated';

  FOR v_column IN
    SELECT attribute.attname
    FROM pg_catalog.pg_attribute AS attribute
    WHERE attribute.attrelid = 'public.profiles'::pg_catalog.regclass
      AND attribute.attnum > 0
      AND NOT attribute.attisdropped
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE UPDATE (%I) ON TABLE public.profiles FROM PUBLIC, anon, authenticated',
      v_column
    );
  END LOOP;

  -- These policies exposed every column on a user's row, including role.
  EXECUTE
    'DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles';
  EXECUTE
    'DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles';

  IF pg_catalog.to_regprocedure(
    'public.update_my_profile(text,text,text)'
  ) IS NULL THEN
    RAISE NOTICE
      'public.update_my_profile(text,text,text) is absent; function hardening skipped';
    RETURN;
  END IF;

  EXECUTE $function$
    CREATE OR REPLACE FUNCTION public.update_my_profile(
      p_full_name text DEFAULT NULL,
      p_business_name text DEFAULT NULL,
      p_phone text DEFAULT NULL
    )
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
    AS $body$
    DECLARE
      v_uid uuid := auth.uid();
    BEGIN
      IF v_uid IS NULL THEN
        RAISE EXCEPTION 'authentication required'
          USING ERRCODE = '42501';
      END IF;

      UPDATE public.profiles AS profile
      SET
        full_name = CASE
          WHEN p_full_name IS NULL
            OR pg_catalog.btrim(p_full_name) = ''
            THEN profile.full_name
          ELSE pg_catalog.btrim(p_full_name)
        END,
        business_name = CASE
          WHEN p_business_name IS NULL THEN profile.business_name
          WHEN pg_catalog.btrim(p_business_name) = '' THEN NULL
          ELSE pg_catalog.btrim(p_business_name)
        END,
        phone = CASE
          WHEN p_phone IS NULL THEN profile.phone
          WHEN pg_catalog.btrim(p_phone) = '' THEN NULL
          ELSE pg_catalog.btrim(p_phone)
        END,
        updated_at = pg_catalog.now()
      WHERE profile.id = v_uid;

      RETURN FOUND;
    END;
    $body$;
  $function$;

  -- New functions default to PUBLIC EXECUTE. Reset the ACL explicitly so
  -- browser callers must be authenticated and no broader role inherits it.
  EXECUTE
    'REVOKE EXECUTE ON FUNCTION public.update_my_profile(text, text, text)
     FROM PUBLIC, anon, authenticated, service_role';
  EXECUTE
    'GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text)
     TO authenticated';
END;
$migration$;

\set ON_ERROR_STOP on

-- Run after applying 20260723112039_billing_identity_state_foundation.sql:
--   psql "$DATABASE_URL" \
--     -f supabase/tests/billing_identity_state_foundation.sql
--
-- This verifier is read-only. It checks the deployed schema, RLS boundary,
-- grants, function hardening, reconciliation timestamps, and deletion/quota
-- retention contract without creating test users or Stripe records.

BEGIN;
SET TRANSACTION READ ONLY;

DO $verification$
DECLARE
  v_table TEXT;
  v_signature TEXT;
  v_function_oid OID;
  v_function_owner OID;
  v_function_acl ACLITEM[];
  v_function_config TEXT[];
  v_is_security_definer BOOLEAN;
  v_definition TEXT;
  v_count INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_enum AS enum_value
    JOIN pg_catalog.pg_type AS enum_type
      ON enum_type.oid = enum_value.enumtypid
    JOIN pg_catalog.pg_namespace AS enum_schema
      ON enum_schema.oid = enum_type.typnamespace
    WHERE enum_schema.nspname = 'public'
      AND enum_type.typname = 'subscription_status'
      AND enum_value.enumlabel = 'paused'
  ) THEN
    RAISE EXCEPTION
      'verification failed: subscription_status is missing paused';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('subscriptions', 'payment_status'),
        ('subscriptions', 'stripe_last_event_created_at'),
        ('subscriptions', 'stripe_reconciled_at'),
        ('subscriptions', 'source_event_id'),
        ('subscriptions', 'updated_at'),
        ('stripe_customers', 'user_id'),
        ('stripe_customers', 'customer_id'),
        ('stripe_customers', 'source_event_created_at'),
        ('stripe_customers', 'updated_at'),
        ('stripe_checkout_attempts', 'id'),
        ('stripe_checkout_attempts', 'user_id'),
        ('stripe_checkout_attempts', 'plan_type'),
        ('stripe_checkout_attempts', 'status'),
        ('stripe_checkout_attempts', 'logical_key'),
        ('stripe_checkout_attempts', 'stripe_idempotency_key'),
        ('stripe_checkout_attempts', 'stripe_session_id'),
        ('stripe_checkout_attempts', 'stripe_customer_id'),
        ('stripe_checkout_attempts', 'stripe_session_created_at'),
        ('stripe_checkout_attempts', 'stripe_reconciled_at'),
        ('stripe_checkout_attempts', 'payment_status'),
        ('stripe_checkout_attempts', 'last_error_code'),
        ('stripe_checkout_attempts', 'updated_at'),
        ('stripe_webhook_events', 'event_id'),
        ('stripe_webhook_events', 'event_type'),
        ('stripe_webhook_events', 'stripe_object_id'),
        ('stripe_webhook_events', 'status'),
        ('stripe_webhook_events', 'event_created_at'),
        ('stripe_webhook_events', 'attempts'),
        ('stripe_webhook_events', 'last_attempt_at'),
        ('stripe_webhook_events', 'next_retry_at'),
        ('stripe_webhook_events', 'last_error_code'),
        ('stripe_webhook_events', 'updated_at'),
        ('ats_memberships', 'user_id'),
        ('ats_memberships', 'status'),
        ('ats_memberships', 'deletion_attempts'),
        ('ats_memberships', 'deletion_requested_at'),
        ('ats_memberships', 'last_deletion_attempt_at'),
        ('ats_memberships', 'next_retry_at'),
        ('ats_memberships', 'billing_canceled_at'),
        ('ats_memberships', 'ats_data_deleted_at'),
        ('ats_memberships', 'deletion_completed_at'),
        ('ats_memberships', 'last_error_code'),
        ('ai_rate_limits', 'subject_user_id'),
        ('ai_rate_limits', 'identity_kind')
    ) AS required(table_name, column_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = pg_catalog.to_regclass(
        'public.' || required.table_name
      )
        AND attribute.attname = required.column_name
        AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    )
  ) THEN
    RAISE EXCEPTION
      'verification failed: a required billing/deletion column is missing';
  END IF;

  FOREACH v_table IN ARRAY ARRAY[
    'stripe_customers',
    'stripe_checkout_attempts',
    'stripe_webhook_events',
    'ats_memberships',
    'ai_rate_limits'
  ] LOOP
    IF pg_catalog.to_regclass('public.' || v_table) IS NULL THEN
      RAISE EXCEPTION 'verification failed: public.% is missing', v_table;
    END IF;

    IF NOT (
      SELECT relation.relrowsecurity
      FROM pg_catalog.pg_class AS relation
      WHERE relation.oid = pg_catalog.to_regclass(
        'public.' || v_table
      )
    ) THEN
      RAISE EXCEPTION
        'verification failed: RLS is disabled on public.%', v_table;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_policy AS policy
      WHERE policy.polrelid = pg_catalog.to_regclass(
        'public.' || v_table
      )
    ) THEN
      RAISE EXCEPTION
        'verification failed: service-only table public.% has an RLS policy',
        v_table;
    END IF;

    IF pg_catalog.has_table_privilege(
         'anon',
         'public.' || v_table,
         'SELECT'
       )
       OR pg_catalog.has_table_privilege(
         'anon',
         'public.' || v_table,
         'INSERT'
       )
       OR pg_catalog.has_table_privilege(
         'anon',
         'public.' || v_table,
         'UPDATE'
       )
       OR pg_catalog.has_table_privilege(
         'anon',
         'public.' || v_table,
         'DELETE'
       )
       OR pg_catalog.has_table_privilege(
         'authenticated',
         'public.' || v_table,
         'SELECT'
       )
       OR pg_catalog.has_table_privilege(
         'authenticated',
         'public.' || v_table,
         'INSERT'
       )
       OR pg_catalog.has_table_privilege(
         'authenticated',
         'public.' || v_table,
         'UPDATE'
       )
       OR pg_catalog.has_table_privilege(
         'authenticated',
         'public.' || v_table,
         'DELETE'
       ) THEN
      RAISE EXCEPTION
        'verification failed: browser role can access public.%', v_table;
    END IF;

    IF NOT (
      pg_catalog.has_table_privilege(
        'service_role',
        'public.' || v_table,
        'SELECT'
      )
      AND pg_catalog.has_table_privilege(
        'service_role',
        'public.' || v_table,
        'INSERT'
      )
      AND pg_catalog.has_table_privilege(
        'service_role',
        'public.' || v_table,
        'UPDATE'
      )
      AND pg_catalog.has_table_privilege(
        'service_role',
        'public.' || v_table,
        'DELETE'
      )
    ) THEN
      RAISE EXCEPTION
        'verification failed: service_role lacks CRUD on public.%', v_table;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class AS relation
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(
          relation.relacl,
          pg_catalog.acldefault('r', relation.relowner)
        )
      ) AS privilege
      WHERE relation.oid = pg_catalog.to_regclass(
        'public.' || v_table
      )
        AND privilege.grantee = 0
    ) THEN
      RAISE EXCEPTION
        'verification failed: PUBLIC has a privilege on public.%', v_table;
    END IF;
  END LOOP;

  IF NOT pg_catalog.has_table_privilege(
       'authenticated',
       'public.subscriptions',
       'SELECT'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated',
       'public.subscriptions',
       'INSERT'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated',
       'public.subscriptions',
       'UPDATE'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated',
       'public.subscriptions',
       'DELETE'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated',
       'public.subscriptions',
       'TRUNCATE'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated',
       'public.subscriptions',
       'REFERENCES'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated',
       'public.subscriptions',
       'TRIGGER'
     ) THEN
    RAISE EXCEPTION
      'verification failed: subscriptions browser grant is not read-only';
  END IF;

  IF NOT (
    SELECT relation.relrowsecurity
    FROM pg_catalog.pg_class AS relation
    WHERE relation.oid = 'public.subscriptions'::pg_catalog.regclass
  ) THEN
    RAISE EXCEPTION
      'verification failed: subscriptions RLS is disabled';
  END IF;

  IF NOT (
    SELECT relation.relrowsecurity
    FROM pg_catalog.pg_class AS relation
    WHERE relation.oid = 'public.profiles'::pg_catalog.regclass
  ) THEN
    RAISE EXCEPTION
      'verification failed: profiles RLS is disabled';
  END IF;

  IF pg_catalog.has_table_privilege(
       'anon',
       'public.profiles',
       'SELECT'
     )
     OR pg_catalog.has_table_privilege(
       'anon',
       'public.profiles',
       'INSERT'
     )
     OR pg_catalog.has_table_privilege(
       'anon',
       'public.profiles',
       'UPDATE'
     )
     OR pg_catalog.has_table_privilege(
       'anon',
       'public.profiles',
       'DELETE'
     )
     OR pg_catalog.has_table_privilege(
       'anon',
       'public.profiles',
       'TRUNCATE'
     )
     OR pg_catalog.has_table_privilege(
       'anon',
       'public.profiles',
       'REFERENCES'
     )
     OR pg_catalog.has_table_privilege(
       'anon',
       'public.profiles',
       'TRIGGER'
     )
     OR NOT pg_catalog.has_table_privilege(
       'authenticated',
       'public.profiles',
       'SELECT'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated',
       'public.profiles',
       'INSERT'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated',
       'public.profiles',
       'UPDATE'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated',
       'public.profiles',
       'DELETE'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated',
       'public.profiles',
       'TRUNCATE'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated',
       'public.profiles',
       'REFERENCES'
     )
     OR pg_catalog.has_table_privilege(
       'authenticated',
       'public.profiles',
       'TRIGGER'
     ) THEN
    RAISE EXCEPTION
      'verification failed: profiles browser grants are not SELECT-only';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy AS policy
    WHERE policy.polrelid = 'public.subscriptions'::pg_catalog.regclass
      AND policy.polcmd = 'r'
      AND policy.polroles @> ARRAY[
        (
          SELECT role.oid
          FROM pg_catalog.pg_roles AS role
          WHERE role.rolname = 'authenticated'
        )
      ]::OID[]
      AND pg_catalog.pg_get_expr(
        policy.polqual,
        policy.polrelid
      ) ILIKE '%auth.uid()%user_id%'
  ) THEN
    RAISE EXCEPTION
      'verification failed: authenticated own-subscription policy is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid =
      'public.subscriptions'::pg_catalog.regclass
      AND conname = 'subscriptions_payment_status_check'
  )
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.pg_constraint
       WHERE conrelid =
         'public.ai_rate_limits'::pg_catalog.regclass
         AND conname = 'ai_rate_limits_identity_kind_check'
     )
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.pg_constraint
       WHERE conrelid =
         'public.ai_rate_limits'::pg_catalog.regclass
         AND conname = 'ai_rate_limits_user_identity_check'
     ) THEN
    RAISE EXCEPTION
      'verification failed: payment/quota identity constraints are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_index AS index_record
    JOIN pg_catalog.pg_class AS index_relation
      ON index_relation.oid = index_record.indexrelid
    WHERE index_relation.relname =
      'stripe_checkout_attempts_one_active_user_idx'
      AND index_record.indisunique
      AND index_record.indpred IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'verification failed: active checkout uniqueness index is missing';
  END IF;

  SELECT pg_catalog.count(*)
  INTO v_count
  FROM pg_catalog.pg_trigger AS trigger_record
  WHERE NOT trigger_record.tgisinternal
    AND trigger_record.tgname IN (
      'subscriptions_set_ats_billing_updated_at',
      'stripe_customers_set_updated_at',
      'stripe_checkout_attempts_set_updated_at',
      'stripe_webhook_events_set_updated_at',
      'ats_memberships_set_updated_at'
    );

  IF v_count <> 5 THEN
    RAISE EXCEPTION
      'verification failed: expected five updated_at triggers, found %',
      v_count;
  END IF;

  FOREACH v_signature IN ARRAY ARRAY[
    'public.has_active_access(uuid)',
    'public.claim_stripe_webhook_event(text,text,text,timestamptz)',
    'public.finish_stripe_webhook_event(text,text,text,timestamptz)',
    'public.claim_stripe_checkout_attempt(uuid,text,text,text)',
    'public.reconcile_stripe_checkout_attempt(jsonb)',
    'public.reconcile_stripe_customer_mapping(uuid,text,timestamptz)',
    'public.reconcile_stripe_subscription(jsonb)',
    'public.consume_ai_rate_limit(text,timestamptz,integer)',
    'public.consume_user_ai_rate_limit(text,timestamptz,integer,uuid)',
    'public.claim_ats_account_deletion(uuid)',
    'public.mark_ats_account_deletion_failed(uuid,text,timestamptz)',
    'public.mark_ats_billing_canceled(uuid)',
    'public.complete_ats_account_deletion(uuid)'
  ] LOOP
    v_function_oid := pg_catalog.to_regprocedure(v_signature);

    IF v_function_oid IS NULL THEN
      RAISE EXCEPTION
        'verification failed: function % is missing', v_signature;
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
        'verification failed: % is SECURITY DEFINER', v_signature;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.unnest(v_function_config) AS setting(value)
      WHERE setting.value IN ('search_path=', 'search_path=""')
    ) THEN
      RAISE EXCEPTION
        'verification failed: % does not have an empty search_path',
        v_signature;
    END IF;

    IF NOT pg_catalog.has_function_privilege(
         'service_role',
         v_function_oid,
         'EXECUTE'
       )
       OR pg_catalog.has_function_privilege(
         'anon',
         v_function_oid,
         'EXECUTE'
       )
       OR pg_catalog.has_function_privilege(
         'authenticated',
         v_function_oid,
         'EXECUTE'
       ) THEN
      RAISE EXCEPTION
        'verification failed: function execution grant is wrong for %',
        v_signature;
    END IF;

    IF EXISTS (
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
        'verification failed: PUBLIC can execute %', v_signature;
    END IF;
  END LOOP;

  v_function_oid := pg_catalog.to_regprocedure(
    'public.set_ats_billing_updated_at()'
  );
  IF v_function_oid IS NULL THEN
    RAISE EXCEPTION
      'verification failed: updated_at trigger function is missing';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('public.has_active_access(uuid)')
  )
  INTO v_definition;

  IF v_definition NOT ILIKE '%payment_status%'
     OR v_definition NOT ILIKE '%is_lifetime IS TRUE%'
     OR v_definition NOT ILIKE '%is_lifetime IS NOT TRUE%'
     OR v_definition NOT ILIKE '%trialing%'
     OR v_definition NOT ILIKE '%ats_memberships%'
     OR v_definition NOT ILIKE '%current_period_end > now()%' THEN
    RAISE EXCEPTION
      'verification failed: has_active_access is not payment-aware';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure(
      'public.reconcile_stripe_checkout_attempt(jsonb)'
    )
  )
  INTO v_definition;

  IF v_definition NOT ILIKE '%stripe_reconciled_at%'
     OR v_definition NOT ILIKE '%attempt.user_id IS DISTINCT FROM v_user_id%'
     OR v_definition NOT ILIKE '%checkout session cannot be reassigned%'
     OR v_definition NOT ILIKE '%checkout customer cannot be reassigned%'
     OR v_definition NOT ILIKE '%attempt.status IN (''completed'', ''expired'')%'
     OR v_definition NOT ILIKE '%:ats-billing-lifecycle%'
     OR v_definition NOT ILIKE '%ATS deletion is in progress%'
     OR v_definition NOT ILIKE '%membership.status = ''deleted''%'
     OR v_definition NOT ILIKE '%membership.billing_canceled_at IS NOT NULL%'
     OR v_definition NOT ILIKE '%v_status IS NULL%' THEN
    RAISE EXCEPTION
      'verification failed: checkout reconciliation is not monotonic';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure(
      'public.claim_stripe_checkout_attempt(uuid,text,text,text)'
    )
  )
  INTO v_definition;

  IF v_definition NOT ILIKE '%:ats-billing-lifecycle%'
     OR v_definition NOT ILIKE '%membership.status <> ''active''%'
     OR v_definition NOT ILIKE '%ATS membership is not eligible for checkout%'
     OR v_definition NOT ILIKE '%p_plan_type IS NULL%' THEN
    RAISE EXCEPTION
      'verification failed: checkout claim is not serialized with ATS deletion';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure(
      'public.reconcile_stripe_customer_mapping(uuid,text,timestamptz)'
    )
  )
  INTO v_definition;

  IF v_definition NOT ILIKE '%:ats-billing-lifecycle%'
     OR v_definition NOT ILIKE '%ATS deletion is in progress%'
     OR v_definition NOT ILIKE '%membership.status = ''deleted''%'
     OR v_definition NOT ILIKE '%membership.billing_canceled_at IS NOT NULL%'
     OR v_definition ILIKE '%public.profiles%' THEN
    RAISE EXCEPTION
      'verification failed: deleted ATS membership can recreate a customer map';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure(
      'public.complete_ats_account_deletion(uuid)'
    )
  )
  INTO v_definition;

  IF v_definition ILIKE '%public.profiles%'
     OR v_definition ILIKE '%billing_address%'
     OR v_definition ILIKE '%payment_method%' THEN
    RAISE EXCEPTION
      'verification failed: ATS deletion mutates shared profile billing fields';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure(
      'public.claim_ats_account_deletion(uuid)'
    )
  )
  INTO v_definition;

  IF v_definition NOT ILIKE '%:ats-billing-lifecycle%'
     OR v_definition NOT ILIKE '%checkout_in_progress%'
     OR v_definition NOT ILIKE '%checkout_claim_abandoned%'
     OR v_definition NOT ILIKE '%attempt.status = ''pending''%' THEN
    RAISE EXCEPTION
      'verification failed: ATS deletion lacks the pending-checkout barrier';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure(
      'public.reconcile_stripe_subscription(jsonb)'
    )
  )
  INTO v_definition;

  IF v_definition NOT ILIKE '%stripe_reconciled_at%'
     OR v_definition NOT ILIKE '%source_event_id%'
     OR v_definition NOT ILIKE '%IS DISTINCT FROM v_user_id%'
     OR v_definition NOT ILIKE '%< EXCLUDED.stripe_reconciled_at%'
     OR v_definition NOT ILIKE '%:ats-billing-lifecycle%'
     OR v_definition NOT ILIKE '%ATS deletion is in progress%'
     OR v_definition NOT ILIKE '%membership.status = ''deleted''%'
     OR v_definition NOT ILIKE '%membership.billing_canceled_at IS NOT NULL%' THEN
    RAISE EXCEPTION
      'verification failed: subscription reconciliation is not monotonic';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure(
      'public.consume_user_ai_rate_limit(text,timestamptz,integer,uuid)'
    )
  )
  INTO v_definition;

  IF v_definition NOT ILIKE '%:ats-billing-lifecycle%'
     OR v_definition NOT ILIKE '%ATS deletion is in progress%'
     OR v_definition NOT ILIKE '%membership.status = ''deleted''%'
     OR v_definition NOT ILIKE '%membership.billing_canceled_at IS NOT NULL%'
     OR v_definition NOT ILIKE '%RETURN QUERY SELECT false, 0%'
     OR v_definition NOT ILIKE '%p_limit IS NULL%' THEN
    RAISE EXCEPTION
      'verification failed: user AI quota can outlive ATS deletion';
  END IF;

  IF pg_catalog.obj_description(
       'public.stripe_webhook_events'::pg_catalog.regclass,
       'pg_class'
     ) NOT ILIKE '%never the raw event payload%' THEN
    RAISE EXCEPTION
      'verification failed: webhook raw-payload retention guard is missing';
  END IF;

  IF pg_catalog.obj_description(
       'public.free_tier_usage'::pg_catalog.regclass,
       'pg_class'
     ) NOT ILIKE '%retained during ATS account deletion%'
     OR pg_catalog.obj_description(
       'public.ai_rate_limits'::pg_catalog.regclass,
       'pg_class'
     ) NOT ILIKE '%anonymous%'
     OR pg_catalog.obj_description(
       'public.ai_rate_limits'::pg_catalog.regclass,
       'pg_class'
     ) NOT ILIKE '%erased during ATS deletion%' THEN
    RAISE EXCEPTION
      'verification failed: quota deletion/retention contract is missing';
  END IF;
END;
$verification$;

ROLLBACK;

-- Disposable-data behavior acceptance (run separately, never in production):
-- 1. Concurrent duplicate event claims: exactly one returns claimed=true.
-- 2. A processed event never reclaims; a failed event waits until next_retry_at.
-- 3. Duplicate checkout logical keys return the same attempt/idempotency key.
-- 4. Older checkout/subscription stripe_reconciled_at updates return false;
--    completed checkout state and paid payment state cannot regress.
-- 5. Lifetime access is false until payment_status='paid'; paused is false.
-- 6. ATS completion refuses when billing cancellation is required but is not
--    recorded, preserves auth.users/profiles unchanged, clears ATS billing
--    tables, removes
--    user-tagged quotas, and retains free_tier_usage/anonymous quota buckets.
-- 7. A deletion claim made while a fresh checkout attempt is pending returns
--    checkout_in_progress; after the checkout reconciles, deletion claims and
--    no later checkout claim can pass the non-active membership barrier.

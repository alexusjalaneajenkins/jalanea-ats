-- Service-owned administrative access grants and bounded retention cleanup for
-- Jalanea ATS. Authorization is keyed only by the immutable Supabase Auth UUID;
-- email addresses and user-editable metadata are never consulted.

CREATE TABLE public.ats_access_grants (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  reason TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ats_access_grants_status_check
    CHECK (status IN ('active', 'revoked')),
  CONSTRAINT ats_access_grants_reason_check
    CHECK (
      reason IS NULL
      OR (
        reason = BTRIM(reason)
        AND CHAR_LENGTH(reason) BETWEEN 1 AND 500
      )
    ),
  CONSTRAINT ats_access_grants_revocation_check
    CHECK (
      (status = 'active' AND revoked_at IS NULL)
      OR (status = 'revoked' AND revoked_at IS NOT NULL)
    )
);

COMMENT ON TABLE public.ats_access_grants IS
  'Service-role-only Jalanea ATS access grants keyed by auth.users.id. Never authorize by email or user metadata.';

COMMENT ON COLUMN public.ats_access_grants.reason IS
  'Short operational reason only; do not store secrets or sensitive user data.';

ALTER TABLE public.ats_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_access_grants FORCE ROW LEVEL SECURITY;

-- No client policies are intentional. Only trusted server code may read or
-- mutate administrative grants.
REVOKE ALL ON TABLE public.ats_access_grants
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.ats_access_grants TO service_role;

CREATE TRIGGER ats_access_grants_set_updated_at
  BEFORE UPDATE ON public.ats_access_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ats_billing_updated_at();

-- Serialize access-grant changes with billing/deletion lifecycle changes.
-- A deleted or deleting shared identity must never regain ATS access through a
-- later administrative-grant write.
CREATE OR REPLACE FUNCTION public.guard_ats_access_grant_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      NEW.user_id::TEXT || ':ats-billing-lifecycle',
      0
    )
  );

  IF EXISTS (
    SELECT 1
    FROM public.ats_memberships AS membership
    WHERE membership.user_id = NEW.user_id
      AND membership.status <> 'active'
  ) THEN
    RAISE EXCEPTION
      'ATS access grants require an active ATS membership';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_ats_access_grant_mutation()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guard_ats_access_grant_mutation()
  TO service_role;

CREATE TRIGGER ats_access_grants_guard_membership
  BEFORE INSERT OR UPDATE ON public.ats_access_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_ats_access_grant_mutation();

CREATE OR REPLACE FUNCTION public.has_valid_ats_access_grant(
  check_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
  SELECT
    check_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.ats_access_grants AS access_grant
      WHERE access_grant.user_id = check_user_id
        AND access_grant.status = 'active'
        AND access_grant.revoked_at IS NULL
        AND (
          access_grant.expires_at IS NULL
          OR access_grant.expires_at > NOW()
        )
    );
$$;

-- Administrative grants and paid subscriptions share one authoritative access
-- decision. Any non-active ATS membership is a deletion/removal tombstone and
-- overrides every entitlement source.
CREATE OR REPLACE FUNCTION public.has_active_access(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
  SELECT
    check_user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.ats_memberships AS membership
      WHERE membership.user_id = check_user_id
        AND membership.status <> 'active'
    )
    AND (
      public.has_valid_ats_access_grant(check_user_id)
      OR EXISTS (
        SELECT 1
        FROM public.subscriptions AS subscription
        WHERE subscription.user_id = check_user_id
          AND (
            (
              subscription.is_lifetime IS TRUE
              AND subscription.status = 'active'
              AND subscription.payment_status = 'paid'
            )
            OR
            (
              subscription.is_lifetime IS NOT TRUE
              AND subscription.status IN ('active', 'trialing')
              AND subscription.current_period_end > NOW()
            )
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.has_valid_ats_access_grant(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_active_access(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_valid_ats_access_grant(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.has_active_access(UUID)
  TO service_role;

-- The shared auth.users identity survives ATS product removal, so the
-- product-scoped access grant must be deleted in the same transaction as all
-- other ATS records. The lifecycle lock also serializes against the grant
-- mutation guard above.
DROP FUNCTION public.complete_ats_account_deletion(UUID);

CREATE FUNCTION public.complete_ats_account_deletion(
  p_user_id UUID
)
RETURNS TABLE (
  deleted_access_grants INTEGER,
  deleted_ai_rate_limits INTEGER,
  deleted_subscriptions INTEGER,
  deleted_checkout_attempts INTEGER,
  deleted_customer_mappings INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_membership public.ats_memberships%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user id is required';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::TEXT || ':ats-billing-lifecycle',
      0
    )
  );

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::TEXT || ':ats-delete', 0)
  );

  SELECT membership.*
  INTO v_membership
  FROM public.ats_memberships AS membership
  WHERE membership.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATS membership does not exist';
  END IF;

  IF v_membership.status = 'deleted' THEN
    RETURN QUERY SELECT 0, 0, 0, 0, 0;
    RETURN;
  END IF;

  IF v_membership.status <> 'deleting' THEN
    RAISE EXCEPTION 'ATS deletion is not currently claimed';
  END IF;

  IF v_membership.billing_canceled_at IS NULL
     AND (
       EXISTS (
         SELECT 1
         FROM public.stripe_customers AS customer
         WHERE customer.user_id = p_user_id
       )
       OR EXISTS (
         SELECT 1
         FROM public.subscriptions AS subscription
         WHERE subscription.user_id = p_user_id
           AND subscription.status NOT IN ('canceled', 'incomplete_expired')
       )
     ) THEN
    RAISE EXCEPTION
      'Stripe billing cancellation must be recorded before ATS deletion';
  END IF;

  DELETE FROM public.ats_access_grants AS access_grant
  WHERE access_grant.user_id = p_user_id;
  GET DIAGNOSTICS deleted_access_grants = ROW_COUNT;

  DELETE FROM public.ai_rate_limits AS limits
  WHERE limits.identity_kind <> 'anonymous'
    AND (
      limits.subject_user_id = p_user_id
      OR (
        limits.identity_kind = 'legacy'
        AND limits.bucket = 'analyze-v2:' || p_user_id::TEXT
      )
    );
  GET DIAGNOSTICS deleted_ai_rate_limits = ROW_COUNT;

  DELETE FROM public.subscriptions AS subscription
  WHERE subscription.user_id = p_user_id;
  GET DIAGNOSTICS deleted_subscriptions = ROW_COUNT;

  DELETE FROM public.stripe_checkout_attempts AS attempt
  WHERE attempt.user_id = p_user_id;
  GET DIAGNOSTICS deleted_checkout_attempts = ROW_COUNT;

  DELETE FROM public.stripe_customers AS customer
  WHERE customer.user_id = p_user_id;
  GET DIAGNOSTICS deleted_customer_mappings = ROW_COUNT;

  UPDATE public.ats_memberships AS membership
  SET
    status = 'deleted',
    ats_data_deleted_at = NOW(),
    deletion_completed_at = NOW(),
    next_retry_at = NULL,
    last_error_code = NULL
  WHERE membership.user_id = p_user_id;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_ats_account_deletion(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_ats_account_deletion(UUID)
  TO service_role;

-- Retain free-tier abuse-prevention counters for seven full days and fixed
-- window AI/contact counters for 48 hours by default. Every invocation is
-- capped per table so a scheduled function stays comfortably within its
-- runtime. Repeated calls safely continue the backlog.
CREATE INDEX IF NOT EXISTS ai_rate_limits_window_start_idx
  ON public.ai_rate_limits (window_start);

CREATE OR REPLACE FUNCTION public.prune_ats_retention(
  p_free_tier_before DATE DEFAULT CURRENT_DATE - 7,
  p_ai_rate_limit_before TIMESTAMPTZ DEFAULT NOW() - INTERVAL '48 hours',
  p_batch_size INTEGER DEFAULT 1000
)
RETURNS TABLE (
  deleted_free_tier_usage INTEGER,
  deleted_ai_rate_limits INTEGER,
  free_tier_has_more BOOLEAN,
  ai_rate_limits_has_more BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF p_free_tier_before IS NULL
     OR p_ai_rate_limit_before IS NULL THEN
    RAISE EXCEPTION 'retention cutoffs are required';
  END IF;

  IF p_free_tier_before > CURRENT_DATE - 1 THEN
    RAISE EXCEPTION 'free-tier cleanup must retain the current day';
  END IF;

  IF p_ai_rate_limit_before > NOW() - INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'AI rate-limit cleanup must retain the current hour';
  END IF;

  IF p_batch_size IS NULL
     OR p_batch_size < 1
     OR p_batch_size > 10000 THEN
    RAISE EXCEPTION 'retention batch size must be between 1 and 10000';
  END IF;

  WITH candidates AS (
    SELECT usage.ctid
    FROM public.free_tier_usage AS usage
    WHERE usage.usage_date < p_free_tier_before
    ORDER BY usage.usage_date, usage.ip_hash
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  ),
  deleted AS (
    DELETE FROM public.free_tier_usage AS usage
    USING candidates
    WHERE usage.ctid = candidates.ctid
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER
  INTO deleted_free_tier_usage
  FROM deleted;

  WITH candidates AS (
    SELECT limits.ctid
    FROM public.ai_rate_limits AS limits
    WHERE limits.window_start < p_ai_rate_limit_before
    ORDER BY limits.window_start, limits.bucket
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  ),
  deleted AS (
    DELETE FROM public.ai_rate_limits AS limits
    USING candidates
    WHERE limits.ctid = candidates.ctid
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER
  INTO deleted_ai_rate_limits
  FROM deleted;

  SELECT EXISTS (
    SELECT 1
    FROM public.free_tier_usage AS usage
    WHERE usage.usage_date < p_free_tier_before
  )
  INTO free_tier_has_more;

  SELECT EXISTS (
    SELECT 1
    FROM public.ai_rate_limits AS limits
    WHERE limits.window_start < p_ai_rate_limit_before
  )
  INTO ai_rate_limits_has_more;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.prune_ats_retention(
  DATE, TIMESTAMPTZ, INTEGER
) IS
  'Service-role-only batched cleanup for expired ATS free-tier and AI/contact rate-limit counters.';

REVOKE ALL ON FUNCTION public.prune_ats_retention(
  DATE, TIMESTAMPTZ, INTEGER
)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.prune_ats_retention(
  DATE, TIMESTAMPTZ, INTEGER
)
  TO service_role;

-- Earlier migrations intentionally kept free-tier counters append/update only.
-- Retention is the sole reason the service role now needs DELETE.
GRANT SELECT, DELETE ON TABLE public.free_tier_usage TO service_role;
GRANT SELECT, DELETE ON TABLE public.ai_rate_limits TO service_role;

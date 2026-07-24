-- Durable, service-role-only state for Stripe reconciliation, checkout
-- idempotency, and ATS-scoped account deletion.
--
-- The Supabase Auth identity is shared with the tutoring product. Nothing in
-- this migration deletes auth.users or the shared public.profiles row.

-- Stripe can report `paused` for subscriptions whose payment collection has
-- been paused. It is intentionally not an entitled status.
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'paused';

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_status TEXT,
  ADD COLUMN IF NOT EXISTS stripe_last_event_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_event_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_reconciled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.subscriptions'::pg_catalog.regclass
      AND conname = 'subscriptions_payment_status_check'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_payment_status_check
      CHECK (
        payment_status IS NULL
        OR payment_status IN ('paid', 'unpaid', 'no_payment_required')
      );
  END IF;
END;
$constraints$;

CREATE TABLE IF NOT EXISTS public.stripe_customers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL UNIQUE,
  source_event_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stripe_customers_customer_id_check
    CHECK (
      customer_id = BTRIM(customer_id)
      AND CHAR_LENGTH(customer_id) BETWEEN 1 AND 255
    )
);

CREATE TABLE IF NOT EXISTS public.stripe_checkout_attempts (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  logical_key TEXT NOT NULL UNIQUE,
  stripe_idempotency_key TEXT NOT NULL UNIQUE,
  stripe_session_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_session_created_at TIMESTAMPTZ,
  stripe_reconciled_at TIMESTAMPTZ,
  payment_status TEXT,
  last_error_code TEXT,
  expires_at TIMESTAMPTZ,
  session_created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stripe_checkout_attempts_plan_type_check
    CHECK (plan_type IN ('lifetime', 'monthly')),
  CONSTRAINT stripe_checkout_attempts_status_check
    CHECK (
      status IN (
        'pending',
        'session_created',
        'completed',
        'failed',
        'expired'
      )
    ),
  CONSTRAINT stripe_checkout_attempts_logical_key_check
    CHECK (
      logical_key = BTRIM(logical_key)
      AND CHAR_LENGTH(logical_key) BETWEEN 1 AND 200
    ),
  CONSTRAINT stripe_checkout_attempts_idempotency_key_check
    CHECK (
      stripe_idempotency_key = BTRIM(stripe_idempotency_key)
      AND CHAR_LENGTH(stripe_idempotency_key) BETWEEN 1 AND 255
    ),
  CONSTRAINT stripe_checkout_attempts_session_id_check
    CHECK (
      stripe_session_id IS NULL
      OR (
        stripe_session_id = BTRIM(stripe_session_id)
        AND CHAR_LENGTH(stripe_session_id) BETWEEN 1 AND 255
      )
    ),
  CONSTRAINT stripe_checkout_attempts_customer_id_check
    CHECK (
      stripe_customer_id IS NULL
      OR (
        stripe_customer_id = BTRIM(stripe_customer_id)
        AND CHAR_LENGTH(stripe_customer_id) BETWEEN 1 AND 255
      )
    ),
  CONSTRAINT stripe_checkout_attempts_payment_status_check
    CHECK (
      payment_status IS NULL
      OR payment_status IN ('paid', 'unpaid', 'no_payment_required')
    ),
  CONSTRAINT stripe_checkout_attempts_error_code_check
    CHECK (
      last_error_code IS NULL
      OR CHAR_LENGTH(last_error_code) BETWEEN 1 AND 100
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS stripe_checkout_attempts_one_active_user_idx
  ON public.stripe_checkout_attempts (user_id)
  WHERE status IN ('pending', 'session_created');

CREATE INDEX IF NOT EXISTS stripe_checkout_attempts_user_created_idx
  ON public.stripe_checkout_attempts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  stripe_object_id TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  event_created_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  first_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  last_error_code TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stripe_webhook_events_event_id_check
    CHECK (
      event_id = BTRIM(event_id)
      AND CHAR_LENGTH(event_id) BETWEEN 1 AND 255
    ),
  CONSTRAINT stripe_webhook_events_event_type_check
    CHECK (
      event_type = BTRIM(event_type)
      AND CHAR_LENGTH(event_type) BETWEEN 1 AND 100
    ),
  CONSTRAINT stripe_webhook_events_object_id_check
    CHECK (
      stripe_object_id IS NULL
      OR (
        stripe_object_id = BTRIM(stripe_object_id)
        AND CHAR_LENGTH(stripe_object_id) BETWEEN 1 AND 255
      )
    ),
  CONSTRAINT stripe_webhook_events_status_check
    CHECK (status IN ('processing', 'processed', 'failed', 'ignored')),
  CONSTRAINT stripe_webhook_events_attempts_check
    CHECK (attempts >= 1),
  CONSTRAINT stripe_webhook_events_error_code_check
    CHECK (
      last_error_code IS NULL
      OR CHAR_LENGTH(last_error_code) BETWEEN 1 AND 100
    )
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_retry_idx
  ON public.stripe_webhook_events (next_retry_at, last_attempt_at)
  WHERE status IN ('processing', 'failed');

COMMENT ON TABLE public.stripe_webhook_events IS
  'Service-role-only Stripe event inbox. Stores Stripe event/object identifiers and lifecycle metadata, never the raw event payload.';

CREATE TABLE IF NOT EXISTS public.ats_memberships (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  deletion_attempts INTEGER NOT NULL DEFAULT 0,
  deletion_requested_at TIMESTAMPTZ,
  last_deletion_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  billing_canceled_at TIMESTAMPTZ,
  ats_data_deleted_at TIMESTAMPTZ,
  deletion_completed_at TIMESTAMPTZ,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ats_memberships_status_check
    CHECK (status IN ('active', 'deleting', 'deleted', 'deletion_failed')),
  CONSTRAINT ats_memberships_deletion_attempts_check
    CHECK (deletion_attempts >= 0),
  CONSTRAINT ats_memberships_error_code_check
    CHECK (
      last_error_code IS NULL
      OR CHAR_LENGTH(last_error_code) BETWEEN 1 AND 100
    )
);

CREATE INDEX IF NOT EXISTS ats_memberships_deletion_retry_idx
  ON public.ats_memberships (next_retry_at, last_deletion_attempt_at)
  WHERE status IN ('deleting', 'deletion_failed');

COMMENT ON TABLE public.ats_memberships IS
  'ATS product membership and retryable ATS-scoped deletion state. A deleted tombstone preserves shared Auth while preventing accidental entitlement restoration.';

-- Tag signed-in quota buckets so ATS deletion can remove them without
-- deleting anonymous/free-tier abuse-prevention records.
ALTER TABLE public.ai_rate_limits
  ADD COLUMN IF NOT EXISTS subject_user_id UUID
    REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS identity_kind TEXT NOT NULL DEFAULT 'legacy';

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.ai_rate_limits'::pg_catalog.regclass
      AND conname = 'ai_rate_limits_identity_kind_check'
  ) THEN
    ALTER TABLE public.ai_rate_limits
      ADD CONSTRAINT ai_rate_limits_identity_kind_check
      CHECK (identity_kind IN ('anonymous', 'user', 'legacy'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.ai_rate_limits'::pg_catalog.regclass
      AND conname = 'ai_rate_limits_user_identity_check'
  ) THEN
    ALTER TABLE public.ai_rate_limits
      ADD CONSTRAINT ai_rate_limits_user_identity_check
      CHECK (
        (identity_kind = 'user' AND subject_user_id IS NOT NULL)
        OR (identity_kind <> 'user' AND subject_user_id IS NULL)
      );
  END IF;
END;
$constraints$;

CREATE INDEX IF NOT EXISTS ai_rate_limits_subject_user_idx
  ON public.ai_rate_limits (subject_user_id)
  WHERE subject_user_id IS NOT NULL;

COMMENT ON TABLE public.free_tier_usage IS
  'Anonymous free-tier abuse-prevention counters. These non-user-linked buckets are retained during ATS account deletion and expire under the quota retention policy.';

COMMENT ON TABLE public.ai_rate_limits IS
  'Service-role-only fixed-window AI counters. User-tagged buckets are erased during ATS deletion; anonymous and non-user-linked legacy buckets are retained for abuse prevention until normal expiry.';

-- Keep updated_at authoritative even when application code omits it.
CREATE OR REPLACE FUNCTION public.set_ats_billing_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_set_ats_billing_updated_at
  ON public.subscriptions;
CREATE TRIGGER subscriptions_set_ats_billing_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ats_billing_updated_at();

DROP TRIGGER IF EXISTS stripe_customers_set_updated_at
  ON public.stripe_customers;
CREATE TRIGGER stripe_customers_set_updated_at
  BEFORE UPDATE ON public.stripe_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ats_billing_updated_at();

DROP TRIGGER IF EXISTS stripe_checkout_attempts_set_updated_at
  ON public.stripe_checkout_attempts;
CREATE TRIGGER stripe_checkout_attempts_set_updated_at
  BEFORE UPDATE ON public.stripe_checkout_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ats_billing_updated_at();

DROP TRIGGER IF EXISTS stripe_webhook_events_set_updated_at
  ON public.stripe_webhook_events;
CREATE TRIGGER stripe_webhook_events_set_updated_at
  BEFORE UPDATE ON public.stripe_webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ats_billing_updated_at();

DROP TRIGGER IF EXISTS ats_memberships_set_updated_at
  ON public.ats_memberships;
CREATE TRIGGER ats_memberships_set_updated_at
  BEFORE UPDATE ON public.ats_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ats_billing_updated_at();

-- Only paid lifetime purchases and currently entitled recurring states grant
-- access. A paused/canceled lifetime row can no longer grant access merely
-- because is_lifetime remains true.
CREATE OR REPLACE FUNCTION public.has_active_access(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions AS subscription
    WHERE subscription.user_id = check_user_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.ats_memberships AS membership
        WHERE membership.user_id = check_user_id
          AND membership.status <> 'active'
      )
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
  );
$$;

CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_stripe_object_id TEXT,
  p_event_created_at TIMESTAMPTZ
)
RETURNS TABLE (
  claimed BOOLEAN,
  event_status TEXT,
  attempt_count INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_event public.stripe_webhook_events%ROWTYPE;
BEGIN
  IF p_event_id IS NULL
     OR BTRIM(p_event_id) = ''
     OR CHAR_LENGTH(p_event_id) > 255
     OR p_event_type IS NULL
     OR BTRIM(p_event_type) = ''
     OR CHAR_LENGTH(p_event_type) > 100
     OR p_event_created_at IS NULL
     OR (
       p_stripe_object_id IS NOT NULL
       AND (
         BTRIM(p_stripe_object_id) = ''
         OR CHAR_LENGTH(p_stripe_object_id) > 255
       )
     ) THEN
    RAISE EXCEPTION 'invalid Stripe event claim';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_event_id, 0)
  );

  SELECT webhook.*
  INTO v_event
  FROM public.stripe_webhook_events AS webhook
  WHERE webhook.event_id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.stripe_webhook_events (
      event_id,
      event_type,
      stripe_object_id,
      status,
      event_created_at,
      attempts
    )
    VALUES (
      p_event_id,
      p_event_type,
      p_stripe_object_id,
      'processing',
      p_event_created_at,
      1
    )
    RETURNING * INTO v_event;

    RETURN QUERY
      SELECT TRUE, v_event.status, v_event.attempts;
    RETURN;
  END IF;

  IF v_event.event_type IS DISTINCT FROM p_event_type
     OR v_event.stripe_object_id IS DISTINCT FROM p_stripe_object_id
     OR v_event.event_created_at IS DISTINCT FROM p_event_created_at THEN
    RAISE EXCEPTION 'Stripe event identifier was reused with different data';
  END IF;

  IF v_event.status IN ('processed', 'ignored') THEN
    RETURN QUERY
      SELECT FALSE, v_event.status, v_event.attempts;
    RETURN;
  END IF;

  IF v_event.status = 'processing'
     AND v_event.last_attempt_at > NOW() - INTERVAL '5 minutes' THEN
    RETURN QUERY
      SELECT FALSE, v_event.status, v_event.attempts;
    RETURN;
  END IF;

  IF v_event.status = 'failed'
     AND v_event.next_retry_at IS NOT NULL
     AND v_event.next_retry_at > NOW() THEN
    RETURN QUERY
      SELECT FALSE, v_event.status, v_event.attempts;
    RETURN;
  END IF;

  UPDATE public.stripe_webhook_events AS webhook
  SET
    status = 'processing',
    attempts = webhook.attempts + 1,
    last_attempt_at = NOW(),
    next_retry_at = NULL,
    last_error_code = NULL,
    processed_at = NULL
  WHERE webhook.event_id = p_event_id
  RETURNING webhook.* INTO v_event;

  RETURN QUERY
    SELECT TRUE, v_event.status, v_event.attempts;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_stripe_webhook_event(
  p_event_id TEXT,
  p_status TEXT,
  p_last_error_code TEXT,
  p_next_retry_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF p_status NOT IN ('processed', 'failed', 'ignored') THEN
    RAISE EXCEPTION 'invalid terminal Stripe event status';
  END IF;

  IF p_last_error_code IS NOT NULL
     AND (
       BTRIM(p_last_error_code) = ''
       OR CHAR_LENGTH(p_last_error_code) > 100
     ) THEN
    RAISE EXCEPTION 'invalid Stripe event error code';
  END IF;

  UPDATE public.stripe_webhook_events AS webhook
  SET
    status = p_status,
    last_error_code = CASE
      WHEN p_status = 'failed' THEN p_last_error_code
      ELSE NULL
    END,
    next_retry_at = CASE
      WHEN p_status = 'failed'
        THEN COALESCE(p_next_retry_at, NOW() + INTERVAL '1 minute')
      ELSE NULL
    END,
    processed_at = CASE
      WHEN p_status IN ('processed', 'ignored') THEN NOW()
      ELSE NULL
    END
  WHERE webhook.event_id = p_event_id
    AND webhook.status = 'processing';

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_stripe_checkout_attempt(
  p_user_id UUID,
  p_plan_type TEXT,
  p_logical_key TEXT,
  p_stripe_customer_id TEXT
)
RETURNS TABLE (
  attempt_id UUID,
  attempt_status TEXT,
  stripe_session_id TEXT,
  stripe_customer_id TEXT,
  stripe_idempotency_key TEXT,
  is_new BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_attempt public.stripe_checkout_attempts%ROWTYPE;
  v_membership public.ats_memberships%ROWTYPE;
  v_attempt_id UUID;
BEGIN
  IF p_user_id IS NULL
     OR p_plan_type IS NULL
     OR p_plan_type NOT IN ('lifetime', 'monthly')
     OR p_logical_key IS NULL
     OR BTRIM(p_logical_key) = ''
     OR CHAR_LENGTH(p_logical_key) > 200
     OR (
       p_stripe_customer_id IS NOT NULL
       AND (
         BTRIM(p_stripe_customer_id) = ''
         OR CHAR_LENGTH(p_stripe_customer_id) > 255
       )
     ) THEN
    RAISE EXCEPTION 'invalid checkout attempt claim';
  END IF;

  -- Serialize checkout claims with ATS deletion claims. Once deletion flips
  -- the membership out of active, no late checkout attempt can be created.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::TEXT || ':ats-billing-lifecycle',
      0
    )
  );

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::TEXT || ':' || p_plan_type,
      0
    )
  );

  PERFORM 1
  FROM public.ats_memberships AS membership
  WHERE membership.user_id = p_user_id
    AND membership.status <> 'active'
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'ATS membership is not eligible for checkout';
  END IF;

  SELECT attempt.*
  INTO v_attempt
  FROM public.stripe_checkout_attempts AS attempt
  WHERE attempt.logical_key = p_logical_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_attempt.user_id IS DISTINCT FROM p_user_id
       OR v_attempt.plan_type IS DISTINCT FROM p_plan_type THEN
      RAISE EXCEPTION 'checkout logical key belongs to another purchase';
    END IF;

    IF v_attempt.stripe_customer_id IS NULL
       AND p_stripe_customer_id IS NOT NULL THEN
      UPDATE public.stripe_checkout_attempts AS attempt
      SET stripe_customer_id = p_stripe_customer_id
      WHERE attempt.id = v_attempt.id
      RETURNING attempt.* INTO v_attempt;
    ELSIF p_stripe_customer_id IS NOT NULL
       AND v_attempt.stripe_customer_id IS DISTINCT FROM p_stripe_customer_id THEN
      RAISE EXCEPTION 'checkout attempt customer cannot be changed';
    END IF;

    RETURN QUERY
      SELECT
        v_attempt.id,
        v_attempt.status,
        v_attempt.stripe_session_id,
        v_attempt.stripe_customer_id,
        v_attempt.stripe_idempotency_key,
        FALSE;
    RETURN;
  END IF;

  SELECT attempt.*
  INTO v_attempt
  FROM public.stripe_checkout_attempts AS attempt
  WHERE attempt.user_id = p_user_id
    AND attempt.status IN ('pending', 'session_created')
  ORDER BY attempt.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_attempt.plan_type IS DISTINCT FROM p_plan_type THEN
      RAISE EXCEPTION 'another checkout plan is already in progress';
    END IF;

    IF v_attempt.stripe_customer_id IS NULL
       AND p_stripe_customer_id IS NOT NULL THEN
      UPDATE public.stripe_checkout_attempts AS attempt
      SET stripe_customer_id = p_stripe_customer_id
      WHERE attempt.id = v_attempt.id
      RETURNING attempt.* INTO v_attempt;
    ELSIF p_stripe_customer_id IS NOT NULL
       AND v_attempt.stripe_customer_id IS DISTINCT FROM p_stripe_customer_id THEN
      RAISE EXCEPTION 'checkout attempt customer cannot be changed';
    END IF;

    RETURN QUERY
      SELECT
        v_attempt.id,
        v_attempt.status,
        v_attempt.stripe_session_id,
        v_attempt.stripe_customer_id,
        v_attempt.stripe_idempotency_key,
        FALSE;
    RETURN;
  END IF;

  v_attempt_id := GEN_RANDOM_UUID();

  INSERT INTO public.stripe_checkout_attempts (
    id,
    user_id,
    plan_type,
    logical_key,
    stripe_idempotency_key,
    stripe_customer_id
  )
  VALUES (
    v_attempt_id,
    p_user_id,
    p_plan_type,
    p_logical_key,
    'ats-checkout-' || v_attempt_id::TEXT,
    p_stripe_customer_id
  )
  RETURNING * INTO v_attempt;

  RETURN QUERY
    SELECT
      v_attempt.id,
      v_attempt.status,
      v_attempt.stripe_session_id,
      v_attempt.stripe_customer_id,
      v_attempt.stripe_idempotency_key,
      TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_stripe_checkout_attempt(
  p_record JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_attempt public.stripe_checkout_attempts%ROWTYPE;
  v_membership public.ats_memberships%ROWTYPE;
  v_id UUID;
  v_user_id UUID;
  v_status TEXT;
  v_stripe_session_id TEXT;
  v_stripe_customer_id TEXT;
  v_stripe_session_created_at TIMESTAMPTZ;
  v_stripe_reconciled_at TIMESTAMPTZ;
  v_payment_status TEXT;
  v_last_error_code TEXT;
  v_expires_at TIMESTAMPTZ;
  v_session_created_at TIMESTAMPTZ;
  v_completed_at TIMESTAMPTZ;
BEGIN
  IF p_record IS NULL
     OR pg_catalog.jsonb_typeof(p_record) <> 'object' THEN
    RAISE EXCEPTION 'Stripe checkout attempt record must be an object';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_object_keys(p_record) AS supplied(key)
    WHERE supplied.key NOT IN (
      'id',
      'user_id',
      'status',
      'stripe_session_id',
      'stripe_customer_id',
      'stripe_session_created_at',
      'stripe_reconciled_at',
      'payment_status',
      'last_error_code',
      'expires_at',
      'session_created_at',
      'completed_at'
    )
  ) THEN
    RAISE EXCEPTION 'Stripe checkout attempt record has unexpected fields';
  END IF;

  BEGIN
    v_id := (p_record->>'id')::UUID;
    v_user_id := (p_record->>'user_id')::UUID;
    v_status := NULLIF(BTRIM(p_record->>'status'), '');
    v_stripe_session_id :=
      NULLIF(BTRIM(p_record->>'stripe_session_id'), '');
    v_stripe_customer_id :=
      NULLIF(BTRIM(p_record->>'stripe_customer_id'), '');
    v_stripe_session_created_at :=
      (p_record->>'stripe_session_created_at')::TIMESTAMPTZ;
    v_stripe_reconciled_at :=
      (p_record->>'stripe_reconciled_at')::TIMESTAMPTZ;
    v_payment_status :=
      NULLIF(BTRIM(p_record->>'payment_status'), '');
    v_last_error_code :=
      NULLIF(BTRIM(p_record->>'last_error_code'), '');
    v_expires_at := (p_record->>'expires_at')::TIMESTAMPTZ;
    v_session_created_at :=
      (p_record->>'session_created_at')::TIMESTAMPTZ;
    v_completed_at := (p_record->>'completed_at')::TIMESTAMPTZ;
  EXCEPTION
    WHEN invalid_text_representation OR datetime_field_overflow THEN
      RAISE EXCEPTION 'Stripe checkout attempt record has invalid types';
  END;

  IF v_id IS NULL
     OR v_user_id IS NULL
     OR v_status IS NULL
     OR v_status NOT IN (
       'pending',
       'session_created',
       'completed',
       'failed',
       'expired'
     )
     OR v_stripe_reconciled_at IS NULL
     OR (
       v_stripe_session_id IS NOT NULL
       AND CHAR_LENGTH(v_stripe_session_id) > 255
     )
     OR (
       v_stripe_customer_id IS NOT NULL
       AND CHAR_LENGTH(v_stripe_customer_id) > 255
     )
     OR (
       v_payment_status IS NOT NULL
       AND v_payment_status NOT IN (
         'paid',
         'unpaid',
         'no_payment_required'
       )
     )
     OR (
       v_last_error_code IS NOT NULL
       AND CHAR_LENGTH(v_last_error_code) > 100
     )
     OR (
       v_status IN ('session_created', 'completed', 'expired')
       AND v_stripe_session_id IS NULL
     )
     OR (
       v_status = 'completed'
       AND v_completed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Stripe checkout attempt record failed validation';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_user_id::TEXT || ':ats-billing-lifecycle',
      0
    )
  );

  SELECT membership.*
  INTO v_membership
  FROM public.ats_memberships AS membership
  WHERE membership.user_id = v_user_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_membership.status = 'deleting' THEN
      RAISE EXCEPTION 'ATS deletion is in progress';
    END IF;
    IF v_membership.status = 'deleted'
       OR v_membership.billing_canceled_at IS NOT NULL THEN
      RETURN FALSE;
    END IF;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_id::TEXT || ':checkout-reconcile', 0)
  );

  SELECT attempt.*
  INTO v_attempt
  FROM public.stripe_checkout_attempts AS attempt
  WHERE attempt.id = v_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stripe checkout attempt does not exist';
  END IF;

  IF v_attempt.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Stripe checkout attempt belongs to another user';
  END IF;

  IF v_attempt.stripe_session_id IS NOT NULL
     AND v_stripe_session_id IS NOT NULL
     AND v_attempt.stripe_session_id IS DISTINCT FROM v_stripe_session_id THEN
    RAISE EXCEPTION 'Stripe checkout session cannot be reassigned';
  END IF;

  IF v_attempt.stripe_customer_id IS NOT NULL
     AND v_stripe_customer_id IS NOT NULL
     AND v_attempt.stripe_customer_id IS DISTINCT FROM v_stripe_customer_id THEN
    RAISE EXCEPTION 'Stripe checkout customer cannot be reassigned';
  END IF;

  IF v_attempt.stripe_reconciled_at IS NOT NULL
     AND v_attempt.stripe_reconciled_at >= v_stripe_reconciled_at THEN
    RETURN FALSE;
  END IF;

  IF v_attempt.status IN ('completed', 'expired')
     AND v_attempt.status IS DISTINCT FROM v_status THEN
    RETURN FALSE;
  END IF;

  IF v_attempt.payment_status = 'paid'
     AND v_payment_status IS NOT NULL
     AND v_payment_status <> 'paid' THEN
    RETURN FALSE;
  END IF;

  UPDATE public.stripe_checkout_attempts AS attempt
  SET
    status = v_status,
    stripe_session_id = COALESCE(
      v_stripe_session_id,
      attempt.stripe_session_id
    ),
    stripe_customer_id = COALESCE(
      v_stripe_customer_id,
      attempt.stripe_customer_id
    ),
    stripe_session_created_at = COALESCE(
      v_stripe_session_created_at,
      attempt.stripe_session_created_at
    ),
    stripe_reconciled_at = v_stripe_reconciled_at,
    payment_status = COALESCE(
      v_payment_status,
      attempt.payment_status
    ),
    last_error_code = v_last_error_code,
    expires_at = COALESCE(v_expires_at, attempt.expires_at),
    session_created_at = COALESCE(
      v_session_created_at,
      attempt.session_created_at
    ),
    completed_at = COALESCE(v_completed_at, attempt.completed_at)
  WHERE attempt.id = v_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_stripe_customer_mapping(
  p_user_id UUID,
  p_customer_id TEXT,
  p_source_event_created_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_applied_user_id UUID;
  v_membership public.ats_memberships%ROWTYPE;
BEGIN
  IF p_user_id IS NULL
     OR p_customer_id IS NULL
     OR BTRIM(p_customer_id) = ''
     OR CHAR_LENGTH(p_customer_id) > 255
     OR p_source_event_created_at IS NULL THEN
    RAISE EXCEPTION 'invalid Stripe customer reconciliation';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::TEXT || ':ats-billing-lifecycle',
      0
    )
  );

  SELECT membership.*
  INTO v_membership
  FROM public.ats_memberships AS membership
  WHERE membership.user_id = p_user_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_membership.status = 'deleting' THEN
      RAISE EXCEPTION 'ATS deletion is in progress';
    END IF;
    IF v_membership.status = 'deleted'
       OR v_membership.billing_canceled_at IS NOT NULL THEN
      RETURN FALSE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.stripe_customers AS customer
    WHERE customer.customer_id = p_customer_id
      AND customer.user_id IS DISTINCT FROM p_user_id
  ) THEN
    RAISE EXCEPTION 'Stripe customer is already mapped to another user';
  END IF;

  INSERT INTO public.stripe_customers (
    user_id,
    customer_id,
    source_event_created_at
  )
  VALUES (
    p_user_id,
    p_customer_id,
    p_source_event_created_at
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    customer_id = EXCLUDED.customer_id,
    source_event_created_at = EXCLUDED.source_event_created_at
  WHERE public.stripe_customers.source_event_created_at IS NULL
    OR public.stripe_customers.source_event_created_at
      <= EXCLUDED.source_event_created_at
  RETURNING public.stripe_customers.user_id INTO v_applied_user_id;

  IF v_applied_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Reconciliation uses the time the handler retrieved the current Stripe
-- object, not delivery order or event time. This prevents a stalled older
-- handler from overwriting a state retrieved later by another handler.
CREATE OR REPLACE FUNCTION public.reconcile_stripe_subscription(
  p_record JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_id TEXT;
  v_user_id UUID;
  v_status public.subscription_status;
  v_payment_status TEXT;
  v_price_id TEXT;
  v_quantity INTEGER;
  v_cancel_at_period_end BOOLEAN;
  v_created TIMESTAMPTZ;
  v_current_period_start TIMESTAMPTZ;
  v_current_period_end TIMESTAMPTZ;
  v_ended_at TIMESTAMPTZ;
  v_cancel_at TIMESTAMPTZ;
  v_canceled_at TIMESTAMPTZ;
  v_trial_start TIMESTAMPTZ;
  v_trial_end TIMESTAMPTZ;
  v_is_lifetime BOOLEAN;
  v_metadata JSONB;
  v_event_created_at TIMESTAMPTZ;
  v_reconciled_at TIMESTAMPTZ;
  v_source_event_id TEXT;
  v_applied_id TEXT;
  v_membership public.ats_memberships%ROWTYPE;
BEGIN
  IF p_record IS NULL
     OR pg_catalog.jsonb_typeof(p_record) <> 'object' THEN
    RAISE EXCEPTION 'Stripe subscription record must be an object';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_object_keys(p_record) AS supplied(key)
    WHERE supplied.key NOT IN (
      'id',
      'user_id',
      'status',
      'payment_status',
      'price_id',
      'quantity',
      'cancel_at_period_end',
      'created',
      'current_period_start',
      'current_period_end',
      'ended_at',
      'cancel_at',
      'canceled_at',
      'trial_start',
      'trial_end',
      'is_lifetime',
      'metadata',
      'stripe_last_event_created_at',
      'stripe_reconciled_at',
      'source_event_id'
    )
  ) THEN
    RAISE EXCEPTION 'Stripe subscription record has unexpected fields';
  END IF;

  BEGIN
    v_id := NULLIF(BTRIM(p_record->>'id'), '');
    v_user_id := (p_record->>'user_id')::UUID;
    v_status := (p_record->>'status')::public.subscription_status;
    v_payment_status := NULLIF(BTRIM(p_record->>'payment_status'), '');
    v_price_id := NULLIF(BTRIM(p_record->>'price_id'), '');
    v_quantity := COALESCE((p_record->>'quantity')::INTEGER, 1);
    v_cancel_at_period_end := COALESCE(
      (p_record->>'cancel_at_period_end')::BOOLEAN,
      FALSE
    );
    v_created := (p_record->>'created')::TIMESTAMPTZ;
    v_current_period_start :=
      (p_record->>'current_period_start')::TIMESTAMPTZ;
    v_current_period_end :=
      (p_record->>'current_period_end')::TIMESTAMPTZ;
    v_ended_at := (p_record->>'ended_at')::TIMESTAMPTZ;
    v_cancel_at := (p_record->>'cancel_at')::TIMESTAMPTZ;
    v_canceled_at := (p_record->>'canceled_at')::TIMESTAMPTZ;
    v_trial_start := (p_record->>'trial_start')::TIMESTAMPTZ;
    v_trial_end := (p_record->>'trial_end')::TIMESTAMPTZ;
    v_is_lifetime := COALESCE(
      (p_record->>'is_lifetime')::BOOLEAN,
      FALSE
    );
    v_event_created_at :=
      (p_record->>'stripe_last_event_created_at')::TIMESTAMPTZ;
    v_reconciled_at :=
      (p_record->>'stripe_reconciled_at')::TIMESTAMPTZ;
    v_source_event_id :=
      NULLIF(BTRIM(p_record->>'source_event_id'), '');
  EXCEPTION
    WHEN invalid_text_representation OR datetime_field_overflow THEN
      RAISE EXCEPTION 'Stripe subscription record has invalid field types';
  END;

  IF NOT (p_record ? 'metadata')
     OR p_record->'metadata' = 'null'::JSONB THEN
    v_metadata := '{}'::JSONB;
  ELSIF pg_catalog.jsonb_typeof(p_record->'metadata') = 'object' THEN
    v_metadata := p_record->'metadata';
  ELSE
    RAISE EXCEPTION 'Stripe subscription metadata must be an object';
  END IF;

  IF v_id IS NULL
     OR CHAR_LENGTH(v_id) > 255
     OR v_user_id IS NULL
     OR v_status IS NULL
     OR v_created IS NULL
     OR v_current_period_start IS NULL
     OR v_current_period_end IS NULL
     OR v_current_period_end < v_current_period_start
     OR v_quantity < 1
     OR v_event_created_at IS NULL
     OR v_reconciled_at IS NULL
     OR v_source_event_id IS NULL
     OR CHAR_LENGTH(v_source_event_id) > 255
     OR (
       v_payment_status IS NOT NULL
       AND v_payment_status NOT IN (
         'paid',
         'unpaid',
         'no_payment_required'
       )
     )
     OR (
       v_is_lifetime
       AND v_status = 'active'
       AND v_payment_status IS DISTINCT FROM 'paid'
  ) THEN
    RAISE EXCEPTION 'Stripe subscription record failed validation';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_user_id::TEXT || ':ats-billing-lifecycle',
      0
    )
  );

  SELECT membership.*
  INTO v_membership
  FROM public.ats_memberships AS membership
  WHERE membership.user_id = v_user_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_membership.status = 'deleting' THEN
      RAISE EXCEPTION 'ATS deletion is in progress';
    END IF;
    IF v_membership.status = 'deleted'
       OR v_membership.billing_canceled_at IS NOT NULL THEN
      RETURN FALSE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.subscriptions AS subscription
    WHERE subscription.id = v_id
      AND subscription.user_id IS DISTINCT FROM v_user_id
  ) THEN
    RAISE EXCEPTION 'Stripe subscription is already mapped to another user';
  END IF;

  INSERT INTO public.subscriptions (
    id,
    user_id,
    status,
    payment_status,
    metadata,
    price_id,
    quantity,
    cancel_at_period_end,
    created,
    current_period_start,
    current_period_end,
    ended_at,
    cancel_at,
    canceled_at,
    trial_start,
    trial_end,
    is_lifetime,
    stripe_last_event_created_at,
    stripe_reconciled_at,
    source_event_id
  )
  VALUES (
    v_id,
    v_user_id,
    v_status,
    v_payment_status,
    v_metadata,
    v_price_id,
    v_quantity,
    v_cancel_at_period_end,
    v_created,
    v_current_period_start,
    v_current_period_end,
    v_ended_at,
    v_cancel_at,
    v_canceled_at,
    v_trial_start,
    v_trial_end,
    v_is_lifetime,
    v_event_created_at,
    v_reconciled_at,
    v_source_event_id
  )
  ON CONFLICT (id) DO UPDATE
  SET
    status = EXCLUDED.status,
    payment_status = EXCLUDED.payment_status,
    metadata = EXCLUDED.metadata,
    price_id = EXCLUDED.price_id,
    quantity = EXCLUDED.quantity,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    created = EXCLUDED.created,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    ended_at = EXCLUDED.ended_at,
    cancel_at = EXCLUDED.cancel_at,
    canceled_at = EXCLUDED.canceled_at,
    trial_start = EXCLUDED.trial_start,
    trial_end = EXCLUDED.trial_end,
    is_lifetime = EXCLUDED.is_lifetime,
    stripe_last_event_created_at =
      EXCLUDED.stripe_last_event_created_at,
    stripe_reconciled_at = EXCLUDED.stripe_reconciled_at,
    source_event_id = EXCLUDED.source_event_id
  WHERE public.subscriptions.user_id = EXCLUDED.user_id
    AND (
      public.subscriptions.stripe_reconciled_at IS NULL
      OR public.subscriptions.stripe_reconciled_at
        < EXCLUDED.stripe_reconciled_at
    )
  RETURNING public.subscriptions.id INTO v_applied_id;

  RETURN v_applied_id IS NOT NULL;
END;
$$;

-- The three-argument function remains for anonymous and legacy callers. New
-- signed-in callers must use consume_user_ai_rate_limit so deletion can find
-- every stable user quota row.
CREATE OR REPLACE FUNCTION public.consume_ai_rate_limit(
  p_bucket TEXT,
  p_window_start TIMESTAMPTZ,
  p_limit INTEGER
)
RETURNS TABLE (allowed BOOLEAN, current_count INTEGER)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_identity_kind TEXT;
BEGIN
  IF p_bucket IS NULL
     OR BTRIM(p_bucket) = ''
     OR p_window_start IS NULL
     OR p_limit IS NULL
     OR p_limit < 1 THEN
    RAISE EXCEPTION 'invalid AI quota request';
  END IF;

  v_identity_kind := CASE
    WHEN p_bucket LIKE '%:anonymous:%' THEN 'anonymous'
    ELSE 'legacy'
  END;

  INSERT INTO public.ai_rate_limits AS limits (
    bucket,
    window_start,
    count,
    subject_user_id,
    identity_kind
  )
  VALUES (
    p_bucket,
    p_window_start,
    1,
    NULL,
    v_identity_kind
  )
  ON CONFLICT (bucket) DO UPDATE
    SET
      window_start = EXCLUDED.window_start,
      count = CASE
        WHEN limits.window_start = EXCLUDED.window_start
          THEN limits.count + 1
        ELSE 1
      END,
      identity_kind = EXCLUDED.identity_kind
    WHERE limits.subject_user_id IS NULL
      AND (
        limits.window_start <> EXCLUDED.window_start
        OR limits.count < p_limit
      )
  RETURNING limits.count INTO current_count;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, current_count;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.ai_rate_limits AS limits
    WHERE limits.bucket = p_bucket
      AND limits.subject_user_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'user-linked AI quota requires the user quota function';
  END IF;

  SELECT limits.count
  INTO current_count
  FROM public.ai_rate_limits AS limits
  WHERE limits.bucket = p_bucket
    AND limits.window_start = p_window_start;

  RETURN QUERY SELECT FALSE, COALESCE(current_count, p_limit);
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_user_ai_rate_limit(
  p_bucket TEXT,
  p_window_start TIMESTAMPTZ,
  p_limit INTEGER,
  p_user_id UUID
)
RETURNS TABLE (allowed BOOLEAN, current_count INTEGER)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_membership public.ats_memberships%ROWTYPE;
BEGIN
  IF p_bucket IS NULL
     OR BTRIM(p_bucket) = ''
     OR p_window_start IS NULL
     OR p_limit IS NULL
     OR p_limit < 1
     OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid user AI quota request';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::TEXT || ':ats-billing-lifecycle',
      0
    )
  );

  SELECT membership.*
  INTO v_membership
  FROM public.ats_memberships AS membership
  WHERE membership.user_id = p_user_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_membership.status = 'deleting' THEN
      RAISE EXCEPTION 'ATS deletion is in progress';
    END IF;
    IF v_membership.status = 'deleted'
       OR v_membership.billing_canceled_at IS NOT NULL THEN
      RETURN QUERY SELECT FALSE, 0;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.ai_rate_limits AS limits (
    bucket,
    window_start,
    count,
    subject_user_id,
    identity_kind
  )
  VALUES (
    p_bucket,
    p_window_start,
    1,
    p_user_id,
    'user'
  )
  ON CONFLICT (bucket) DO UPDATE
    SET
      window_start = EXCLUDED.window_start,
      count = CASE
        WHEN limits.window_start = EXCLUDED.window_start
          THEN limits.count + 1
        ELSE 1
      END
    WHERE limits.subject_user_id = p_user_id
      AND limits.identity_kind = 'user'
      AND (
        limits.window_start <> EXCLUDED.window_start
        OR limits.count < p_limit
      )
  RETURNING limits.count INTO current_count;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, current_count;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.ai_rate_limits AS limits
    WHERE limits.bucket = p_bucket
      AND (
        limits.subject_user_id IS DISTINCT FROM p_user_id
        OR limits.identity_kind <> 'user'
      )
  ) THEN
    RAISE EXCEPTION 'AI quota bucket belongs to another identity';
  END IF;

  SELECT limits.count
  INTO current_count
  FROM public.ai_rate_limits AS limits
  WHERE limits.bucket = p_bucket
    AND limits.subject_user_id = p_user_id
    AND limits.identity_kind = 'user'
    AND limits.window_start = p_window_start;

  RETURN QUERY SELECT FALSE, COALESCE(current_count, p_limit);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_ats_account_deletion(
  p_user_id UUID
)
RETURNS TABLE (
  claimed BOOLEAN,
  deletion_status TEXT,
  attempt_count INTEGER
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

  -- A pending row is a durable lease proving that the checkout handler may be
  -- between its database claim and Stripe session reconciliation. Do not
  -- snapshot billing for deletion until that bounded provider call finishes.
  IF EXISTS (
    SELECT 1
    FROM public.stripe_checkout_attempts AS attempt
    WHERE attempt.user_id = p_user_id
      AND attempt.status = 'pending'
      AND attempt.updated_at > NOW() - INTERVAL '5 minutes'
  ) THEN
    SELECT membership.*
    INTO v_membership
    FROM public.ats_memberships AS membership
    WHERE membership.user_id = p_user_id;

    RETURN QUERY
      SELECT
        FALSE,
        'checkout_in_progress'::TEXT,
        COALESCE(v_membership.deletion_attempts, 0);
    RETURN;
  END IF;

  -- The Stripe SDK request timeout is bounded well below this lease. Preserve
  -- the row for provider-session discovery, but close the abandoned claim so
  -- deletion can reconcile any session carrying its checkout_attempt_id.
  UPDATE public.stripe_checkout_attempts AS attempt
  SET
    status = 'failed',
    last_error_code = 'checkout_claim_abandoned'
  WHERE attempt.user_id = p_user_id
    AND attempt.status = 'pending'
    AND attempt.updated_at <= NOW() - INTERVAL '5 minutes';

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::TEXT || ':ats-delete', 0)
  );

  SELECT membership.*
  INTO v_membership
  FROM public.ats_memberships AS membership
  WHERE membership.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.ats_memberships (
      user_id,
      status,
      deletion_attempts,
      deletion_requested_at,
      last_deletion_attempt_at
    )
    VALUES (
      p_user_id,
      'deleting',
      1,
      NOW(),
      NOW()
    )
    RETURNING * INTO v_membership;

    RETURN QUERY
      SELECT TRUE, v_membership.status, v_membership.deletion_attempts;
    RETURN;
  END IF;

  IF v_membership.status = 'deleted' THEN
    RETURN QUERY
      SELECT FALSE, v_membership.status, v_membership.deletion_attempts;
    RETURN;
  END IF;

  IF v_membership.status = 'deleting'
     AND v_membership.last_deletion_attempt_at
       > NOW() - INTERVAL '5 minutes' THEN
    RETURN QUERY
      SELECT FALSE, v_membership.status, v_membership.deletion_attempts;
    RETURN;
  END IF;

  IF v_membership.status = 'deletion_failed'
     AND v_membership.next_retry_at IS NOT NULL
     AND v_membership.next_retry_at > NOW() THEN
    RETURN QUERY
      SELECT FALSE, v_membership.status, v_membership.deletion_attempts;
    RETURN;
  END IF;

  UPDATE public.ats_memberships AS membership
  SET
    status = 'deleting',
    deletion_attempts = membership.deletion_attempts + 1,
    deletion_requested_at = COALESCE(
      membership.deletion_requested_at,
      NOW()
    ),
    last_deletion_attempt_at = NOW(),
    next_retry_at = NULL,
    last_error_code = NULL
  WHERE membership.user_id = p_user_id
  RETURNING membership.* INTO v_membership;

  RETURN QUERY
    SELECT TRUE, v_membership.status, v_membership.deletion_attempts;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_ats_account_deletion_failed(
  p_user_id UUID,
  p_error_code TEXT,
  p_next_retry_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF p_error_code IS NULL
     OR BTRIM(p_error_code) = ''
     OR CHAR_LENGTH(p_error_code) > 100 THEN
    RAISE EXCEPTION 'invalid ATS deletion error code';
  END IF;

  UPDATE public.ats_memberships AS membership
  SET
    status = 'deletion_failed',
    last_error_code = p_error_code,
    next_retry_at = COALESCE(
      p_next_retry_at,
      NOW() + INTERVAL '5 minutes'
    )
  WHERE membership.user_id = p_user_id
    AND membership.status = 'deleting';

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_ats_billing_canceled(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.ats_memberships AS membership
  SET billing_canceled_at = NOW()
  WHERE membership.user_id = p_user_id
    AND membership.status IN ('deleting', 'deletion_failed');

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_ats_account_deletion(
  p_user_id UUID
)
RETURNS TABLE (
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
    RETURN QUERY SELECT 0, 0, 0, 0;
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

-- Defense in depth for every server-owned table.
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_checkout_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions"
  ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.stripe_customers
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.stripe_checkout_attempts
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.stripe_webhook_events
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ats_memberships
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.subscriptions
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.profiles
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ai_rate_limits
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.stripe_customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.stripe_checkout_attempts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.stripe_webhook_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.ats_memberships TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.subscriptions TO service_role;
GRANT SELECT ON TABLE public.subscriptions TO authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.ai_rate_limits TO service_role;

REVOKE ALL ON FUNCTION public.set_ats_billing_updated_at()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_active_access(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(
  TEXT, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_stripe_webhook_event(
  TEXT, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_stripe_checkout_attempt(
  UUID, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_stripe_checkout_attempt(JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_stripe_customer_mapping(
  UUID, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_stripe_subscription(JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_ai_rate_limit(
  TEXT, TIMESTAMPTZ, INTEGER
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_user_ai_rate_limit(
  TEXT, TIMESTAMPTZ, INTEGER, UUID
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_ats_account_deletion(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_ats_account_deletion_failed(
  UUID, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_ats_billing_canceled(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_ats_account_deletion(UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_active_access(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(
  TEXT, TEXT, TEXT, TIMESTAMPTZ
) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_stripe_webhook_event(
  TEXT, TEXT, TEXT, TIMESTAMPTZ
) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_stripe_checkout_attempt(
  UUID, TEXT, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_stripe_checkout_attempt(JSONB)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_stripe_customer_mapping(
  UUID, TEXT, TIMESTAMPTZ
) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_stripe_subscription(JSONB)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_ai_rate_limit(
  TEXT, TIMESTAMPTZ, INTEGER
) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_user_ai_rate_limit(
  TEXT, TIMESTAMPTZ, INTEGER, UUID
) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_ats_account_deletion(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_ats_account_deletion_failed(
  UUID, TEXT, TIMESTAMPTZ
) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_ats_billing_canceled(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_ats_account_deletion(UUID)
  TO service_role;

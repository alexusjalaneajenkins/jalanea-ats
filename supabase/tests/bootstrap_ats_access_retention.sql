\set ON_ERROR_STOP on

-- Minimal disposable PostgreSQL fixture for exercising the Stage 6 migration
-- and its behavioral verifier without mutating a linked Supabase project.

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;

CREATE TABLE auth.users (
  instance_id UUID NOT NULL,
  id UUID PRIMARY KEY,
  aud TEXT,
  role TEXT,
  email TEXT,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMPTZ,
  raw_app_meta_data JSONB,
  raw_user_meta_data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE public.free_tier_usage (
  ip_hash TEXT NOT NULL,
  usage_date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, usage_date)
);

CREATE INDEX idx_free_tier_usage_date
  ON public.free_tier_usage (usage_date);

CREATE TABLE public.ai_rate_limits (
  bucket TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  subject_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_kind TEXT NOT NULL DEFAULT 'legacy'
);

CREATE TABLE public.ats_memberships (
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.subscriptions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  is_lifetime BOOLEAN NOT NULL DEFAULT FALSE,
  payment_status TEXT,
  current_period_end TIMESTAMPTZ NOT NULL
);

CREATE TABLE public.stripe_customers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL
);

CREATE TABLE public.stripe_checkout_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

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

CREATE FUNCTION public.complete_ats_account_deletion(p_user_id UUID)
RETURNS TABLE (
  deleted_ai_rate_limits INTEGER,
  deleted_subscriptions INTEGER,
  deleted_checkout_attempts INTEGER,
  deleted_customer_mappings INTEGER
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT 0, 0, 0, 0;
$$;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.free_tier_usage TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.ai_rate_limits TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.ats_memberships TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.stripe_customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.stripe_checkout_attempts TO service_role;

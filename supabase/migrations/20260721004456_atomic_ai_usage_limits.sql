-- Atomic counters for server-funded AI requests.
-- These tables are service-role only: browser clients must never mutate quotas.

ALTER TABLE public.free_tier_usage ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  bucket TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 0)
);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_free_tier_usage(
  p_identity_hash TEXT,
  p_usage_date DATE,
  p_limit INTEGER
)
RETURNS TABLE (allowed BOOLEAN, current_count INTEGER)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.free_tier_usage AS usage (ip_hash, usage_date, count)
  VALUES (p_identity_hash, p_usage_date, 1)
  ON CONFLICT (ip_hash, usage_date) DO UPDATE
    SET count = usage.count + 1
    WHERE usage.count < p_limit
  RETURNING usage.count INTO current_count;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, current_count;
    RETURN;
  END IF;

  SELECT usage.count
  INTO current_count
  FROM public.free_tier_usage AS usage
  WHERE usage.ip_hash = p_identity_hash
    AND usage.usage_date = p_usage_date;

  RETURN QUERY SELECT FALSE, COALESCE(current_count, p_limit);
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_free_tier_usage(
  p_identity_hash TEXT,
  p_usage_date DATE
)
RETURNS INTEGER
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.free_tier_usage
  SET count = GREATEST(count - 1, 0)
  WHERE ip_hash = p_identity_hash
    AND usage_date = p_usage_date
  RETURNING count;
$$;

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
BEGIN
  INSERT INTO public.ai_rate_limits AS limits (bucket, window_start, count)
  VALUES (p_bucket, p_window_start, 1)
  ON CONFLICT (bucket) DO UPDATE
    SET
      window_start = EXCLUDED.window_start,
      count = CASE
        WHEN limits.window_start = EXCLUDED.window_start THEN limits.count + 1
        ELSE 1
      END
    WHERE limits.window_start <> EXCLUDED.window_start
      OR limits.count < p_limit
  RETURNING limits.count INTO current_count;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, current_count;
    RETURN;
  END IF;

  SELECT limits.count
  INTO current_count
  FROM public.ai_rate_limits AS limits
  WHERE limits.bucket = p_bucket
    AND limits.window_start = p_window_start;

  RETURN QUERY SELECT FALSE, COALESCE(current_count, p_limit);
END;
$$;

REVOKE ALL ON TABLE public.free_tier_usage FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ai_rate_limits FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.consume_free_tier_usage(TEXT, DATE, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_free_tier_usage(TEXT, DATE) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_ai_rate_limit(TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.free_tier_usage TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_free_tier_usage(TEXT, DATE, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_free_tier_usage(TEXT, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_ai_rate_limit(TEXT, TIMESTAMPTZ, INTEGER) TO service_role;

COMMENT ON TABLE public.ai_rate_limits IS
  'Service-role-only fixed-window counters for server-funded AI endpoints.';

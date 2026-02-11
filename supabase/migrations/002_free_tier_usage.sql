-- Free Tier Usage Tracking
-- Persists daily usage counts so they survive server restarts/redeploys.
-- Accessed only via service role key (no RLS needed).

CREATE TABLE IF NOT EXISTS public.free_tier_usage (
  ip_hash TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_hash, usage_date)
);

-- Index for periodic cleanup of old records
CREATE INDEX IF NOT EXISTS idx_free_tier_usage_date ON public.free_tier_usage(usage_date);

-- Optional: auto-delete records older than 7 days (run via cron or manually)
-- DELETE FROM public.free_tier_usage WHERE usage_date < CURRENT_DATE - INTERVAL '7 days';

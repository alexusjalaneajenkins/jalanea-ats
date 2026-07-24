-- These Stripe starter tables predate the current migration history and were
-- exposed with every table privilege granted to anon/authenticated and no RLS.
-- The public catalog only needs read access to active products and prices;
-- writes remain server/service-role only.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_tier_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.products FROM anon, authenticated;
REVOKE ALL ON TABLE public.prices FROM anon, authenticated;
REVOKE ALL ON TABLE public.free_tier_usage FROM anon, authenticated;
GRANT SELECT ON TABLE public.products TO anon, authenticated;
GRANT SELECT ON TABLE public.prices TO anon, authenticated;
DROP POLICY IF EXISTS "public read active products" ON public.products;
CREATE POLICY "public read active products"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (active IS TRUE);
DROP POLICY IF EXISTS "public read active prices" ON public.prices;
CREATE POLICY "public read active prices"
  ON public.prices
  FOR SELECT
  TO anon, authenticated
  USING (active IS TRUE);

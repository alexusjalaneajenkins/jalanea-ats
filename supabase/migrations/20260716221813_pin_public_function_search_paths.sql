-- Prevent caller-controlled name resolution inside shared public helpers.
-- These functions use only PL/pgSQL variables and pg_catalog built-ins, so an
-- empty search path is sufficient and avoids trusting objects in public.
ALTER FUNCTION public.generate_receipt_code() SET search_path = '';
ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.update_updated_at() SET search_path = '';

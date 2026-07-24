-- Tighten Data API privileges for the canonical Learning Unit table.
--
-- RLS already limits rows to staff, but Supabase projects may carry broad
-- default privileges for public tables. Keep the exposed-table posture
-- explicit: anon gets no table privileges; authenticated gets SELECT only,
-- and the "staff read learning units" RLS policy still gates the rows.

REVOKE ALL ON TABLE public.learning_units FROM anon;
REVOKE ALL ON TABLE public.learning_units FROM authenticated;
GRANT SELECT ON TABLE public.learning_units TO authenticated;

-- ────────────────────────────────────────────────────────────────────
-- Harden EXECUTE grants on the notification helper functions.
--
-- Postgres grants EXECUTE on functions to PUBLIC by default, so the
-- earlier `REVOKE ... FROM anon` was ineffective on its own — anon
-- still executed through the PUBLIC grant (the in-function
-- auth.uid() IS NULL guards kept the data safe; this closes the door
-- entirely). Revoke from PUBLIC and grant back only the roles that
-- have any business calling these.
-- ────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.get_thread_push_targets(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_thread_push_targets(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_recap_push_targets(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_recap_push_targets(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.delete_push_subscription(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_push_subscription(text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.claim_thread_email(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_thread_email(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_recap_email_targets(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_recap_email_targets(uuid) TO authenticated, service_role;

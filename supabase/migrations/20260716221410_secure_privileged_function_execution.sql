-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. These
-- SECURITY DEFINER helpers are for signed-in staff/caregivers or internal
-- triggers, never for anonymous Data API callers.

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_set_role(uuid, public.app_role)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role)
  TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_children() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_children() TO authenticated;
-- Trigger functions are invoked by their trigger, not through PostgREST.
REVOKE ALL ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;
-- Legacy subscription helper is not used by the browser application. Keep it
-- available only to the server role and pin its name resolution.
ALTER FUNCTION public.has_active_access(uuid) SET search_path = '';
REVOKE ALL ON FUNCTION public.has_active_access(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_access(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.is_guardian_of(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_guardian_of(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
REVOKE ALL ON FUNCTION public.link_guardian_profile(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_guardian_profile(uuid, uuid)
  TO authenticated;
REVOKE ALL ON FUNCTION public.list_caregiver_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_caregiver_profiles() TO authenticated;
REVOKE ALL ON FUNCTION public.log_admin_event(text, text, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_admin_event(text, text, jsonb)
  TO authenticated;
REVOKE ALL ON FUNCTION public.mark_thread_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_thread_read(uuid) TO authenticated;

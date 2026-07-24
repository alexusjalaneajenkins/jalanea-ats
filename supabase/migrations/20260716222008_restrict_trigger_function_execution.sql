-- Trigger functions execute through their table triggers. Signed-in clients
-- never need a direct PostgREST EXECUTE grant on them.
REVOKE ALL ON FUNCTION public.log_goal_event()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_habit_event()
  FROM PUBLIC, anon, authenticated;

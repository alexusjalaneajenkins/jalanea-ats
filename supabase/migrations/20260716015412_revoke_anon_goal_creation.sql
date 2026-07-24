-- The hardening migration revoked the default PUBLIC privilege, but the live
-- project retained an older explicit anon grant. This definer RPC performs
-- authenticated tutor/admin authorization and must never be an anon endpoint.
REVOKE ALL ON FUNCTION public.create_goal_with_habits(uuid, jsonb, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_goal_with_habits(uuid, jsonb, jsonb)
  TO authenticated;

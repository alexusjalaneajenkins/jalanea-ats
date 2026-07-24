-- ────────────────────────────────────────────────────────────────────
-- Test-account cleanup (owner request, 2026-07-13)
--
-- The 2026-07 role backfill promoted every pre-signup profile to
-- 'tutor', which included throwaway demo accounts. The owner's real
-- test setup is:
--   alexxusjenkins91@gmail.com  → admin (owner — untouched)
--   tysmirth11@gmail.com        → tutor-side test (stays tutor)
--   kirito011rblx@gmail.com     → parent-side test (signs up later;
--                                 new signups default to caregiver)
-- Everything on @demo.local / @test.jalanea.dev drops to caregiver
-- (least privilege), and the change is recorded in the audit trail.
-- ────────────────────────────────────────────────────────────────────

WITH demoted AS (
  UPDATE public.profiles p
  SET role = 'caregiver'
  FROM auth.users u
  WHERE p.id = u.id
    AND p.role <> 'caregiver'
    AND (lower(u.email) LIKE '%@demo.local'
      OR lower(u.email) LIKE '%@test.jalanea.dev')
  RETURNING u.email
)
INSERT INTO public.audit_events (actor_email, action, target, detail)
SELECT 'migration 20260713000002',
       'role.change',
       lower(email),
       jsonb_build_object('new_role', 'caregiver',
                          'reason', 'test account cleanup')
FROM demoted;

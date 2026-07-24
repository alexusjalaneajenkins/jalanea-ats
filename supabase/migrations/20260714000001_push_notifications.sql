-- ────────────────────────────────────────────────────────────────────
-- Push notifications (wave F, part 2: Web Push)
--
-- A push subscription is an endpoint URL (a capability URL that must
-- be kept secret) plus its p256dh/auth encryption keys. Owners manage
-- their own rows through RLS; the server reads the OTHER party's
-- subscriptions only through the SECURITY DEFINER helpers below:
-- 1. get_thread_push_targets — for messages. Same participant logic
--    as claim_thread_email, but NO throttle: unlike email, every
--    message pushes (that is the point of the channel). Guardian-sent
--    messages notify admin accounts (the practice owner); staff-sent
--    messages notify the thread guardian.
-- 2. get_recap_push_targets — for parent recaps. Linked guardians
--    only, honoring the "feedback" notification preference.
-- 3. delete_push_subscription — cleanup when the push service reports
--    a subscription gone (404/410).
-- Payloads never carry message or recap content, and no child names —
-- only that something arrived, plus a portal path.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.push_subscriptions IS
  'Web Push subscriptions. Endpoints are capability URLs — never expose them to other users; cross-user reads happen only via the SECURITY DEFINER functions in this migration.';
CREATE INDEX IF NOT EXISTS push_subscriptions_profile_idx
  ON public.push_subscriptions (profile_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
-- Owners see, register, and remove their own subscriptions. No UPDATE
-- policy: a changed subscription is a new row (endpoint is unique).
DROP POLICY IF EXISTS "push subscriptions read own" ON public.push_subscriptions;
CREATE POLICY "push subscriptions read own" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);
DROP POLICY IF EXISTS "push subscriptions create own" ON public.push_subscriptions;
CREATE POLICY "push subscriptions create own" ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = profile_id);
DROP POLICY IF EXISTS "push subscriptions delete own" ON public.push_subscriptions;
CREATE POLICY "push subscriptions delete own" ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (auth.uid() = profile_id);
/** Hand the server the counterparty's push subscriptions for a thread
 *  the caller participates in. Mirrors claim_thread_email's participant
 *  checks, without the throttle — every message pushes. */
CREATE OR REPLACE FUNCTION public.get_thread_push_targets(p_thread_id uuid)
RETURNS TABLE (endpoint text, p256dh text, auth text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  t record;
  caller_is_staff boolean;
BEGIN
  -- Anonymous callers get nothing. Without this, the participant check
  -- below silently passes for anon: guardian_profile_id <> NULL is NULL,
  -- and plpgsql treats a NULL condition as false — skipping the RETURN.
  IF auth.uid() IS NULL THEN RETURN; END IF;

  SELECT * INTO t FROM public.message_threads WHERE id = p_thread_id;
  IF t.id IS NULL THEN RETURN; END IF;

  caller_is_staff := public.is_staff();
  IF NOT caller_is_staff
     AND t.guardian_profile_id IS DISTINCT FROM auth.uid() THEN
    RETURN; -- not a participant
  END IF;

  IF caller_is_staff THEN
    RETURN QUERY
      SELECT ps.endpoint, ps.p256dh, ps.auth
      FROM public.push_subscriptions ps
      WHERE ps.profile_id = t.guardian_profile_id;
  ELSE
    RETURN QUERY
      SELECT ps.endpoint, ps.p256dh, ps.auth
      FROM public.push_subscriptions ps
      JOIN public.profiles p ON p.id = ps.profile_id
      WHERE p.role = 'admin';
  END IF;
END;
$$;
/** Push subscriptions of a student's linked guardians, honoring the
 *  "feedback" notification preference. Staff callers only. */
CREATE OR REPLACE FUNCTION public.get_recap_push_targets(p_student_id uuid)
RETURNS TABLE (endpoint text, p256dh text, auth text)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT ps.endpoint, ps.p256dh, ps.auth
  FROM public.student_guardians sg
  JOIN public.push_subscriptions ps ON ps.profile_id = sg.guardian_profile_id
  LEFT JOIN public.notification_prefs np ON np.profile_id = sg.guardian_profile_id
  WHERE sg.student_id = p_student_id
    AND sg.guardian_profile_id IS NOT NULL
    AND public.is_staff()
    AND COALESCE(np.prefs->>'feedback', 'true') <> 'false';
$$;
/** Remove a dead subscription by endpoint. Endpoints are unguessable
 *  capability URLs, so knowing one is proof enough to delete it; this
 *  is called by whichever authenticated participant received a 404/410
 *  from the push service while sending to it. */
CREATE OR REPLACE FUNCTION public.delete_push_subscription(p_endpoint text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF; -- authenticated sessions only
  DELETE FROM public.push_subscriptions WHERE endpoint = p_endpoint;
END;
$$;
-- Belt and suspenders: none of these helpers has any business being
-- callable with the public anon key.
REVOKE EXECUTE ON FUNCTION public.get_thread_push_targets(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_recap_push_targets(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_push_subscription(text) FROM anon;
-- ────────────────────────────────────────────────────────────────────
-- Retroactive hardening: claim_thread_email (20260713000007) has the
-- same NULL-comparison flaw this migration avoids — an anon caller
-- holding a thread id would fall through the participant check and
-- receive admin email addresses. Re-create it with the guard, and
-- revoke anon EXECUTE on both email helpers while we're here.
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_thread_email(p_thread_id uuid)
RETURNS TABLE (email text, side text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  t record;
  caller_is_staff boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  SELECT * INTO t FROM public.message_threads WHERE id = p_thread_id;
  IF t.id IS NULL THEN RETURN; END IF;

  caller_is_staff := public.is_staff();
  IF NOT caller_is_staff
     AND t.guardian_profile_id IS DISTINCT FROM auth.uid() THEN
    RETURN; -- not a participant
  END IF;

  IF caller_is_staff THEN
    IF t.last_email_to_guardian_at IS NOT NULL
       AND t.last_email_to_guardian_at > now() - interval '15 minutes' THEN
      RETURN;
    END IF;
    UPDATE public.message_threads
      SET last_email_to_guardian_at = now() WHERE id = p_thread_id;
    RETURN QUERY
      SELECT u.email::text, 'guardian'::text
      FROM auth.users u
      WHERE u.id = t.guardian_profile_id AND u.email IS NOT NULL;
  ELSE
    IF t.last_email_to_tutor_at IS NOT NULL
       AND t.last_email_to_tutor_at > now() - interval '15 minutes' THEN
      RETURN;
    END IF;
    UPDATE public.message_threads
      SET last_email_to_tutor_at = now() WHERE id = p_thread_id;
    RETURN QUERY
      SELECT u.email::text, 'tutor'::text
      FROM auth.users u
      JOIN public.profiles p ON p.id = u.id
      WHERE p.role = 'admin' AND u.email IS NOT NULL;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_thread_email(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_recap_email_targets(uuid) FROM anon;

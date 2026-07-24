-- ────────────────────────────────────────────────────────────────────
-- Email notifications (wave F, part 1: Resend)
--
-- Two SECURITY DEFINER helpers hand the server the counterparty's
-- email address — the client never sees anyone's email through these:
-- 1. claim_thread_email — for messages. Atomically checks and stamps
--    a 15-minute per-recipient throttle on the thread so a rapid
--    back-and-forth sends one email, not ten. Returns zero rows when
--    throttled. Guardian-sent messages notify admin accounts (the
--    practice owner); staff-sent messages notify the thread guardian.
-- 2. get_recap_email_targets — for parent recaps. Linked guardians
--    only, honoring the "feedback" notification preference.
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.message_threads
  ADD COLUMN IF NOT EXISTS last_email_to_guardian_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_email_to_tutor_at timestamptz;
CREATE OR REPLACE FUNCTION public.claim_thread_email(p_thread_id uuid)
RETURNS TABLE (email text, side text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  t record;
  caller_is_staff boolean;
BEGIN
  SELECT * INTO t FROM public.message_threads WHERE id = p_thread_id;
  IF t.id IS NULL THEN RETURN; END IF;

  caller_is_staff := public.is_staff();
  IF NOT caller_is_staff AND t.guardian_profile_id <> auth.uid() THEN
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
CREATE OR REPLACE FUNCTION public.get_recap_email_targets(p_student_id uuid)
RETURNS TABLE (email text)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT u.email::text
  FROM public.student_guardians sg
  JOIN auth.users u ON u.id = sg.guardian_profile_id
  LEFT JOIN public.notification_prefs np ON np.profile_id = sg.guardian_profile_id
  WHERE sg.student_id = p_student_id
    AND sg.guardian_profile_id IS NOT NULL
    AND public.is_staff()
    AND u.email IS NOT NULL
    AND COALESCE(np.prefs->>'feedback', 'true') <> 'false';
$$;

-- ────────────────────────────────────────────────────────────────────
-- Admin Console foundation (design: "Jalanea Tutor: Admin Console")
--
-- 1. audit_events — append-only administrative audit trail.
--    Readable by admins only; written ONLY through SECURITY DEFINER
--    functions (no direct insert/update/delete policies exist, so the
--    trail cannot be edited from the client at all).
-- 2. admin_list_users / admin_set_role — the cross-RLS authorization
--    pattern already used by the guardian bridge: the function itself
--    verifies the caller is an admin before touching auth.users.
-- 3. The owner account (alexxusjenkins91@gmail.com) can never be
--    demoted, so the console cannot lock itself out.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit events admin read" ON public.audit_events;
CREATE POLICY "audit events admin read" ON public.audit_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));
CREATE INDEX IF NOT EXISTS audit_events_created_at_idx
  ON public.audit_events (created_at DESC);
-- Every account with its role — admin-only, joins auth.users for email.
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  role public.app_role,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
    SELECT u.id, u.email::text,
           COALESCE(p.role, 'caregiver'::public.app_role),
           u.created_at, u.last_sign_in_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    ORDER BY u.created_at;
END;
$$;
-- Change an account's role; refuses to touch the owner; audited.
CREATE OR REPLACE FUNCTION public.admin_set_role(target_id uuid, new_role public.app_role)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_email text;
  target_email text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT lower(u.email) INTO target_email FROM auth.users u WHERE u.id = target_id;
  IF target_email IS NULL THEN
    RAISE EXCEPTION 'no such account';
  END IF;
  IF target_email = 'alexxusjenkins91@gmail.com' THEN
    RAISE EXCEPTION 'the owner account is locked to full access';
  END IF;

  INSERT INTO public.profiles (id, role) VALUES (target_id, new_role)
  ON CONFLICT (id) DO UPDATE SET role = excluded.role;

  SELECT u.email INTO caller_email FROM auth.users u WHERE u.id = auth.uid();
  INSERT INTO public.audit_events (actor_id, actor_email, action, target, detail)
  VALUES (auth.uid(), caller_email, 'role.change', target_email,
          jsonb_build_object('new_role', new_role));
END;
$$;
-- Generic audit logger for other admin actions (e.g. log exports).
-- Non-admin calls are ignored rather than raised so it can never
-- break a page render.
CREATE OR REPLACE FUNCTION public.log_admin_event(p_action text, p_target text, p_detail jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE caller_email text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RETURN;
  END IF;

  SELECT u.email INTO caller_email FROM auth.users u WHERE u.id = auth.uid();
  INSERT INTO public.audit_events (actor_id, actor_email, action, target, detail)
  VALUES (auth.uid(), caller_email, p_action, p_target, COALESCE(p_detail, '{}'::jsonb));
END;
$$;

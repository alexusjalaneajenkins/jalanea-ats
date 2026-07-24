-- ────────────────────────────────────────────────────────────────────
-- Public sign-up + owner account (Wave 4/5 of the design build)
--
-- Self-sufficient: the remote DB never received the early app_role
-- work (discovered 2026-07 — "column role does not exist" on push),
-- so this migration creates the enum + column if missing, then:
-- 1. New signups default to 'caregiver' (never 'tutor').
-- 2. Auto-provision a minimal profile row per new auth user; wrapped
--    so a profile hiccup can never break signup (missing row is
--    treated as 'caregiver' by the app's role gate).
-- 3. Alexus's account is the owner: role 'admin'.
-- ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'tutor', 'caregiver');
  END IF;
END
$$;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role public.app_role NOT NULL DEFAULT 'caregiver';
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'caregiver';
-- Existing profiles predate public signup — they are the tutor(s).
-- (Runs once: only rows that still carry the fresh column's default.)
UPDATE public.profiles SET role = 'tutor' WHERE role = 'caregiver';
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, role)
    VALUES (NEW.id, 'caregiver')
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- never block signup on profile provisioning
  END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Owner account
UPDATE public.profiles p
SET role = 'admin'
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email) = 'alexxusjenkins91@gmail.com';

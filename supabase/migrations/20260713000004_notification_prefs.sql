-- ────────────────────────────────────────────────────────────────────
-- Notification preferences (design wave D: "Parent Account")
--
-- One row per account, self-managed. Nothing sends email yet — the
-- preference is recorded now and honored when notifications ship
-- with the August relaunch. Keys are free-form ("reminders",
-- "feedback", "progress", "news").
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_prefs (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prefs self read" ON public.notification_prefs;
CREATE POLICY "prefs self read" ON public.notification_prefs
  FOR SELECT TO authenticated USING (profile_id = auth.uid());
DROP POLICY IF EXISTS "prefs self insert" ON public.notification_prefs;
CREATE POLICY "prefs self insert" ON public.notification_prefs
  FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS "prefs self update" ON public.notification_prefs;
CREATE POLICY "prefs self update" ON public.notification_prefs
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

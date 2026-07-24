-- ────────────────────────────────────────────────────────────────────
-- In-app messaging (design wave C: "Tutor Connect" + "Parent Messages")
--
-- Model: one thread per (student, linked guardian account). The tutor
-- side (role tutor/admin) sees every thread; a caregiver sees only
-- threads where they are the linked guardian. Messages are immutable
-- (no update/delete policies); read receipts happen through a
-- SECURITY DEFINER function that can only stamp read_at on the OTHER
-- party's unread messages.
-- ────────────────────────────────────────────────────────────────────

/** RLS helper: is the current user staff (tutor or admin)? */
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('tutor', 'admin')
  );
$$;
CREATE TABLE IF NOT EXISTS public.message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, guardian_profile_id)
);
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('tutor', 'caregiver')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS messages_thread_created_idx
  ON public.messages (thread_id, created_at);
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
-- Threads: staff see all; a guardian sees their own.
DROP POLICY IF EXISTS "threads read" ON public.message_threads;
CREATE POLICY "threads read" ON public.message_threads
  FOR SELECT TO authenticated
  USING (public.is_staff() OR guardian_profile_id = auth.uid());
-- Staff may open a thread with any guardian actually linked to the
-- student; a guardian may open one for themselves on their own child.
DROP POLICY IF EXISTS "threads create" ON public.message_threads;
CREATE POLICY "threads create" ON public.message_threads
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.is_staff()
      AND EXISTS (
        SELECT 1 FROM public.student_guardians sg
        WHERE sg.student_id = message_threads.student_id
          AND sg.guardian_profile_id = message_threads.guardian_profile_id
      )
    )
    OR (
      guardian_profile_id = auth.uid()
      AND public.is_guardian_of(student_id)
    )
  );
-- Messages: visible to thread participants; senders write as
-- themselves with the role they actually hold. Immutable after send.
DROP POLICY IF EXISTS "messages read" ON public.messages;
CREATE POLICY "messages read" ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.message_threads t
    WHERE t.id = messages.thread_id
      AND (public.is_staff() OR t.guardian_profile_id = auth.uid())
  ));
DROP POLICY IF EXISTS "messages send" ON public.messages;
CREATE POLICY "messages send" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      (public.is_staff() AND sender_role = 'tutor')
      OR (
        sender_role = 'caregiver'
        AND EXISTS (
          SELECT 1 FROM public.message_threads t
          WHERE t.id = messages.thread_id
            AND t.guardian_profile_id = auth.uid()
        )
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.message_threads t
      WHERE t.id = messages.thread_id
        AND (public.is_staff() OR t.guardian_profile_id = auth.uid())
    )
  );
/** Stamp read_at on the other party's unread messages in a thread the
 *  caller participates in. The only write path besides insert. */
CREATE OR REPLACE FUNCTION public.mark_thread_read(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.message_threads t
    WHERE t.id = p_thread_id
      AND (public.is_staff() OR t.guardian_profile_id = auth.uid())
  ) THEN
    RETURN;
  END IF;

  UPDATE public.messages
  SET read_at = now()
  WHERE thread_id = p_thread_id
    AND read_at IS NULL
    AND sender_id <> auth.uid();
END;
$$;

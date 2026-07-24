-- ────────────────────────────────────────────────────────────────────
-- Mood Check-ins + Setting Events (Phase 3 of the ABA implementation plan)
--
-- The student home's mood check-in becomes the MO scan's data source:
-- students self-report at the top of a visit; tutors additionally
-- quick-log setting events ("slept badly", "no meds") they learn about.
-- Both land here — the tutor's student view renders the latest + a
-- 7-day strip and raises an "adjust today" flag on low moods.
--
-- Security model mirrors prompt_events (append-only telemetry):
--   INSERT open (students write via cookie-auth server actions = anon),
--   SELECT authenticated tutors only, no UPDATE/DELETE for anyone.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE mood_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  /** Who reported: the student's own check-in, or a tutor-logged
   *  setting event learned in conversation. */
  source TEXT NOT NULL DEFAULT 'student' CHECK (source IN ('student', 'tutor')),
  /** Student check-ins: great | good | okay | low | frustrated.
   *  Tutor setting-events: free label from the student's ABA-profile
   *  watchlist (e.g. "Slept badly"). */
  mood TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mood_checkins_student ON mood_checkins(student_id, occurred_at DESC);
ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can append mood checkins"
  ON mood_checkins FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Authenticated tutors read mood checkins"
  ON mood_checkins FOR SELECT
  USING (auth.uid() IS NOT NULL);
-- Append-only: no UPDATE/DELETE policies.;

-- ────────────────────────────────────────────────────────────────────
-- Reinforcement Dials (Phase 4 of the ABA implementation plan)
--
-- Per-student reinforcement configuration the LESSON RUNTIME reads:
--   xp_multiplier     — reinforcement RATE/magnitude dial (denser XP for
--                       students who need higher reinforcement density)
--   celebration_style — 'full' (confetti, big modal) vs 'calm' (same flow,
--                       no confetti, softer presentation — low-stim)
--   reward_menu       — tutor-curated reward names surfaced at closing
--                       ritual time; Phase 5 preference data feeds this
--
-- Kept SEPARATE from student_aba_profiles on purpose: profiles hold
-- sensitive clinical data (tutor-only RLS); dials are operational
-- preferences the student's own cookie-auth (anon role) lesson runtime
-- must read. Nothing here is sensitive.
--
-- RLS: SELECT open (lesson runtime), writes authenticated tutors only.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE student_reinforcement_dials (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  xp_multiplier NUMERIC NOT NULL DEFAULT 1 CHECK (xp_multiplier IN (1, 1.5, 2)),
  celebration_style TEXT NOT NULL DEFAULT 'full'
    CHECK (celebration_style IN ('full', 'calm')),
  reward_menu JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE student_reinforcement_dials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reinforcement dials"
  ON student_reinforcement_dials FOR SELECT
  USING (true);
CREATE POLICY "Authenticated tutors write reinforcement dials"
  ON student_reinforcement_dials FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated tutors update reinforcement dials"
  ON student_reinforcement_dials FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

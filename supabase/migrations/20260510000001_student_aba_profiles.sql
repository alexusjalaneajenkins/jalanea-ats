-- ────────────────────────────────────────────────────────────────────
-- Student ABA Profiles (Phase 1 of the ABA implementation plan)
--
-- One row per student. Holds the tutor-authored behavioral profile:
--   operational definitions of target behaviors, function hypotheses
--   for challenge behaviors, reinforcer hypotheses (Phase 5's
--   preference assessments will write results here), the prompting
--   default, and the setting-event watchlist for the MO scan.
--
-- SECURITY: this table holds sensitive behavioral data about children.
-- It is TUTOR-FACING ONLY — students never read it. Tutors authenticate
-- through Supabase auth, so access requires an authenticated session.
-- NO anon access (deliberately NOT mirroring the permissive USING(true)
-- pattern used by older student-surface tables).
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE student_aba_profiles (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,

  /** [{ behavior, definition }] — observable, measurable target behaviors,
   *  e.g. { behavior: "Division fluency",
   *         definition: "Completes 3-step division problems with <=1 verbal prompt" } */
  operational_definitions JSONB NOT NULL DEFAULT '[]',

  /** [{ behavior, function, notes }] — function is one of
   *  attention | escape | tangible | automatic */
  function_hypotheses JSONB NOT NULL DEFAULT '[]',

  /** [{ name, quality, notes }] — quality: high | medium | low | untested.
   *  Phase 5 preference assessments update quality from real choices. */
  reinforcers JSONB NOT NULL DEFAULT '[]',

  /** Baseline prompting approach for NEW skills. Per-task judgment can
   *  override live; this is the student's default. */
  prompting_default TEXT NOT NULL DEFAULT 'least_to_most'
    CHECK (prompting_default IN ('errorless', 'least_to_most')),

  /** ["Slept badly", "No meds today", ...] — the MO-scan watchlist
   *  checked at the top of every session (Phase 3 wires this). */
  setting_events JSONB NOT NULL DEFAULT '[]',

  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE student_aba_profiles ENABLE ROW LEVEL SECURITY;
-- Authenticated (tutor) sessions only. No anon role access of any kind.
CREATE POLICY "Authenticated tutors manage ABA profiles"
  ON student_aba_profiles FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

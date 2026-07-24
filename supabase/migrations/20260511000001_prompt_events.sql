-- ────────────────────────────────────────────────────────────────────
-- Prompt Events (Phase 2 of the ABA implementation plan)
--
-- Append-only telemetry of prompting/support levels — the raw data
-- behind "needed fewer prompts every week" parent graphs (Phase 6).
--
-- Event kinds:
--   hint          — student revealed hint N during practice (level '1'|'2'|'3')
--   answer_reveal — student gave up and showed the answer
--   attempt       — student answered an MC/interactive item (correct set)
--   tutor_mark    — tutor tap-logged support level in a LIVE session
--                   (level 'independent'|'verbal'|'model'|'full')
--
-- SECURITY MODEL (append-only):
--   INSERT: open (students write via cookie-auth server actions = anon
--           role; the service-role migration will tighten this later)
--   SELECT: authenticated tutors only
--   UPDATE/DELETE: nobody — behavioral data doesn't get rewritten.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE prompt_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_slug TEXT NOT NULL,             -- curriculum slug, or 'live-session' for tutor marks
  phase TEXT NOT NULL CHECK (phase IN ('practice', 'quiz', 'live')),
  item_idx INTEGER,                      -- scenario/question index within the phase
  event_type TEXT NOT NULL CHECK (event_type IN ('hint', 'answer_reveal', 'attempt', 'tutor_mark')),
  level TEXT,                            -- hint number, or I/V/M/F for tutor marks
  correct BOOLEAN,                       -- attempt events only
  detail JSONB NOT NULL DEFAULT '{}',    -- theme, mode, task label, etc.
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prompt_events_student ON prompt_events(student_id, occurred_at DESC);
CREATE INDEX idx_prompt_events_lesson ON prompt_events(lesson_slug);
ALTER TABLE prompt_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can append prompt events"
  ON prompt_events FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Authenticated tutors read prompt events"
  ON prompt_events FOR SELECT
  USING (auth.uid() IS NOT NULL);
-- No UPDATE or DELETE policies: the table is append-only by design.;

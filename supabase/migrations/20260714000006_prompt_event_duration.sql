-- ────────────────────────────────────────────────────────────────────
-- Per-question timing (goals build order #1)
--
-- Adds elapsed time to the existing per-question attempt telemetry. The
-- lesson player already logs an 'attempt' event per item into the
-- append-only prompt_events table (20260511000001); this hangs a
-- duration_ms on that same row so we can later answer "how long did this
-- problem take" — the "12 minutes → 2 minutes" curve the goals design
-- (docs/plans/2026-07-14-student-goals-progress-design.md) is built on.
--
-- Semantics (set by the client, see use-question-timer.ts):
--   * SOLVE time — the clock starts when the answerable question is first
--     on screen (for flip-card scenarios, when the student flips to "Your
--     Turn"), so worked-example reading time is NOT counted.
--   * time-to-FIRST-attempt only — retries on the same item send NULL so
--     the metric can't be corrupted by a second try.
--   * VISIBLE time only — the timer pauses while the tab is hidden, so a
--     kid walking away doesn't inflate the number.
--   * NULL for hint / answer_reveal / tutor_mark events and for any
--     attempt where timing wasn't captured.
--
-- KNOWN GAPS for the future rollup layer to handle (not this slice):
--   * drag/match/sequence interactives log no 'attempt' event, so those
--     items carry NO timing — a speed metric must treat them as untimed,
--     not as instant.
--   * "Preview as student" logs under the real student, so preview runs
--     can write outlier durations until a preview flag is added.
--
-- No RLS change: duration rides on the existing prompt_events row and
-- inherits its posture (INSERT open for cookie-auth students, SELECT
-- authenticated tutors, no UPDATE/DELETE — append-only).
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE prompt_events ADD COLUMN IF NOT EXISTS duration_ms integer;
-- Guard against nonsense values without rejecting the common NULL. Added
-- idempotently so a re-run of the migration can't error on a dup constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prompt_events_duration_ms_nonneg'
  ) THEN
    ALTER TABLE prompt_events
      ADD CONSTRAINT prompt_events_duration_ms_nonneg
      CHECK (duration_ms IS NULL OR duration_ms >= 0);
  END IF;
END $$;
COMMENT ON COLUMN prompt_events.duration_ms IS
  'Visible time-to-first-attempt in ms for attempt events (tab-hidden time excluded). NULL for hint/answer_reveal/tutor_mark, retries, and legacy rows.';

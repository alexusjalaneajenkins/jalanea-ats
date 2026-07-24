-- ────────────────────────────────────────────────────────────────────
-- Log break requests as ABA data
--
-- The lesson player now has an "I need a break" button (the sensory
-- setting `breaks` has defaulted to ON since the sensory system shipped,
-- but nothing ever honored it). A break request is not UI noise — it is
-- the single most informative antecedent event the player can capture.
--
-- WHY: a kid who is overwhelmed escapes the demand somehow. Functional
-- Communication Training replaces escape-via-behavior with a request.
-- When the kid taps Break, they are TELLING us the demand got too big —
-- and the row records exactly where: which lesson, which phase, which
-- item, and how long the rest took. That is antecedent data. It answers
-- "what set this off", which is the question the whole ABA pipeline
-- exists to answer.
--
-- Two constraints blocked it:
--
--  1. event_type CHECK allowed only hint/answer_reveal/attempt/
--     tutor_mark. Adding break_start + break_end.
--
--  2. phase CHECK allowed only practice/quiz/live — but the player has
--     FOUR phases (show, interact, practice, quiz). So no event in Learn
--     or Explore could ever be written; an insert would just fail the
--     constraint. Breaks are most likely exactly there (a kid checks out
--     during instruction, not only during questions), so widening phase
--     is required, not incidental. This also unblocks logging hints and
--     attempts from those phases later.
--
-- Modeled on 20260714000006 (duration_ms): widen the constraint, keep
-- every existing row valid, no data migration.
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.prompt_events
  DROP CONSTRAINT IF EXISTS prompt_events_event_type_check;
ALTER TABLE public.prompt_events
  ADD CONSTRAINT prompt_events_event_type_check
  CHECK (event_type IN (
    'hint',
    'answer_reveal',
    'attempt',
    'tutor_mark',
    -- The kid asked for a break. detail.item_idx/phase say where.
    'break_start',
    -- The kid came back. duration_ms carries how long they rested.
    'break_end'
  ));
ALTER TABLE public.prompt_events
  DROP CONSTRAINT IF EXISTS prompt_events_phase_check;
ALTER TABLE public.prompt_events
  ADD CONSTRAINT prompt_events_phase_check
  CHECK (phase IN ('show', 'interact', 'practice', 'quiz', 'live'));
COMMENT ON COLUMN public.prompt_events.duration_ms IS
  'attempt: visible time-to-first-attempt. break_end: how long the break '
  'lasted. Never negative (see prompt_events_duration_nonneg).';

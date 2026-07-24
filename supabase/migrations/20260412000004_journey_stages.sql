-- Student journey stage tracking
-- Stages: intake → orientation → diagnostic → planning → active → paused → discharged
-- Can be auto-computed or manually overridden by the tutor

CREATE TYPE student_journey_stage AS ENUM (
  'intake',
  'orientation',
  'diagnostic',
  'planning',
  'active',
  'paused',
  'discharged'
);
-- Add journey_stage to students (nullable = auto-compute, set = manual override)
ALTER TABLE students ADD COLUMN journey_stage student_journey_stage;
-- Set existing archived students to discharged
UPDATE students SET journey_stage = 'discharged' WHERE status = 'archived';

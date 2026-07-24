-- Canonical Learning Unit pilot
--
-- This creates the stable curriculum spine for the first vertical slice:
-- diagnostic skill tag -> learning unit -> assignment -> lesson runtime ->
-- prompt evidence -> tutor/parent progress.
--
-- Existing slug-based data stays valid during the transition. The new unit
-- columns are nullable and backfilled for the current Grade 3 multiplication
-- lesson only.

CREATE TABLE IF NOT EXISTS public.learning_units (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL CHECK (version > 0),
  subject TEXT NOT NULL CHECK (subject IN ('math', 'reading', 'ela', 'science', 'social')),
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 0 AND 12),
  category TEXT NOT NULL,
  topic_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  skill_tags TEXT[] NOT NULL DEFAULT '{}',
  prerequisites TEXT[] NOT NULL DEFAULT '{}',
  readiness TEXT NOT NULL CHECK (readiness IN ('planned', 'draft', 'ready', 'archived')),
  lesson_slug TEXT,
  content_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, version)
);
ALTER TABLE public.learning_units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read learning units" ON public.learning_units;
CREATE POLICY "staff read learning units" ON public.learning_units
  FOR SELECT TO authenticated
  USING (public.is_staff());
GRANT SELECT ON public.learning_units TO authenticated;
INSERT INTO public.learning_units (
  id,
  version,
  subject,
  grade_level,
  category,
  topic_key,
  title,
  description,
  skill_tags,
  prerequisites,
  readiness,
  lesson_slug,
  content_path
) VALUES (
  'math-g3-multiply-1-digit-by-3-digit-v1',
  1,
  'math',
  3,
  'Operations & Algebraic Thinking',
  'math-g3-multiplication-division',
  'Multiply a 1-digit number by a 3-digit number',
  'Break a three-digit number into expanded form, multiply each part by a one-digit factor, then add the partial products.',
  ARRAY[
    'intro_multiplication',
    'multiplication_facts',
    'multiplication_word_problems',
    'multi_digit_multiplication'
  ],
  ARRAY[
    'Fluent addition within 100',
    'Place value with hundreds, tens, and ones',
    'Basic multiplication as equal groups'
  ],
  'ready',
  '3-3-multiplication',
  'src/app/(tutor)/tutor/curriculum/math/[lessonSlug]/content-3-3-multiplication.ts'
) ON CONFLICT (id) DO UPDATE SET
  version = EXCLUDED.version,
  subject = EXCLUDED.subject,
  grade_level = EXCLUDED.grade_level,
  category = EXCLUDED.category,
  topic_key = EXCLUDED.topic_key,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  skill_tags = EXCLUDED.skill_tags,
  prerequisites = EXCLUDED.prerequisites,
  readiness = EXCLUDED.readiness,
  lesson_slug = EXCLUDED.lesson_slug,
  content_path = EXCLUDED.content_path,
  updated_at = now();
ALTER TABLE public.curriculum_assignments
  ADD COLUMN IF NOT EXISTS learning_unit_id TEXT REFERENCES public.learning_units(id),
  ADD COLUMN IF NOT EXISTS learning_unit_version INTEGER;
UPDATE public.curriculum_assignments
SET
  learning_unit_id = 'math-g3-multiply-1-digit-by-3-digit-v1',
  learning_unit_version = 1
WHERE lesson_slug = '3-3-multiplication'
  AND learning_unit_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_curr_assignments_learning_unit
  ON public.curriculum_assignments(student_id, learning_unit_id)
  WHERE learning_unit_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_curr_assignments_student_learning_unit
  ON public.curriculum_assignments(student_id, learning_unit_id)
  WHERE learning_unit_id IS NOT NULL;
ALTER TABLE public.prompt_events
  ADD COLUMN IF NOT EXISTS learning_unit_id TEXT REFERENCES public.learning_units(id),
  ADD COLUMN IF NOT EXISTS learning_unit_version INTEGER;
UPDATE public.prompt_events
SET
  learning_unit_id = 'math-g3-multiply-1-digit-by-3-digit-v1',
  learning_unit_version = 1
WHERE lesson_slug = '3-3-multiplication'
  AND learning_unit_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_prompt_events_learning_unit
  ON public.prompt_events(student_id, learning_unit_id, occurred_at DESC)
  WHERE learning_unit_id IS NOT NULL;

-- Editable curriculum metadata layered over the version-controlled catalog.
-- Static catalog topics only get a row after an admin changes them. Custom
-- topics always have a row. Immutable topic_key preserves assignments/history
-- when a title changes; archived_at is a soft delete.

CREATE TABLE public.curriculum_topic_records (
  topic_key text PRIMARY KEY,
  source text NOT NULL DEFAULT 'custom' CHECK (source IN ('catalog', 'custom')),
  grade smallint NOT NULL CHECK (grade BETWEEN 1 AND 12),
  subject text NOT NULL CHECK (subject IN ('math', 'ela', 'science', 'social')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  detail text NOT NULL DEFAULT '' CHECK (char_length(detail) <= 500),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'draft', 'ready')),
  lesson_slug text,
  outline jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(outline) = 'object'),
  order_position integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  updated_by_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT curriculum_ready_requires_lesson CHECK (
    status <> 'ready' OR (lesson_slug IS NOT NULL AND btrim(lesson_slug) <> '')
  )
);
CREATE INDEX curriculum_topic_records_grade_subject_order_idx
  ON public.curriculum_topic_records (grade, subject, order_position)
  WHERE archived_at IS NULL;
ALTER TABLE public.curriculum_topic_records ENABLE ROW LEVEL SECURITY;
-- INVARIANT: only authenticated tutor/admin accounts can see curriculum
-- overlays. An authenticated role alone is not authorization.
CREATE POLICY "Tutor team reads curriculum topics"
  ON public.curriculum_topic_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'tutor')
    )
  );
-- INVARIANT: curriculum structure is owner/admin controlled. Tutors can use
-- the map but cannot silently change the shared catalog.
CREATE POLICY "Admins create curriculum topics"
  ON public.curriculum_topic_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
    AND created_by_profile_id = (SELECT auth.uid())
    AND updated_by_profile_id = (SELECT auth.uid())
  );
CREATE POLICY "Admins update curriculum topics"
  ON public.curriculum_topic_records
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
    AND updated_by_profile_id = (SELECT auth.uid())
  );
REVOKE ALL ON public.curriculum_topic_records FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.curriculum_topic_records TO authenticated;

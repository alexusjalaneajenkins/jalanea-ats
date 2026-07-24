-- ============================================================
-- Lesson Platform Tables
-- Supports: interactive lessons, student progress tracking,
-- text highlights, quiz responses, library items, and games
-- ============================================================

-- Section type enum
CREATE TYPE lesson_section_type AS ENUM ('text', 'video', 'game', 'quiz', 'image');
-- Lesson status enum
CREATE TYPE lesson_status AS ENUM ('draft', 'published', 'archived');
-- Library item type enum
CREATE TYPE library_item_type AS ENUM ('book', 'video', 'game', 'article');
-- Game category enum
CREATE TYPE game_category AS ENUM ('math', 'reading', 'science', 'writing', 'logic', 'fun');
-- ─── Lessons ───────────────────────────────────────────────

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tutor_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  status lesson_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);
-- Auto-update updated_at
CREATE TRIGGER set_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
CREATE INDEX idx_lessons_student ON lessons(student_id);
CREATE INDEX idx_lessons_tutor ON lessons(tutor_profile_id);
CREATE INDEX idx_lessons_status ON lessons(status);
-- ─── Lesson Sections ───────────────────────────────────────

CREATE TABLE lesson_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  type lesson_section_type NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lesson_sections_lesson ON lesson_sections(lesson_id);
-- ─── Student Progress (section completion) ─────────────────

CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES lesson_sections(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, section_id)
);
CREATE INDEX idx_lesson_progress_student ON lesson_progress(student_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
-- ─── Text Highlights ───────────────────────────────────────

CREATE TABLE text_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES lesson_sections(id) ON DELETE CASCADE,
  selected_text TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'yellow',
  start_offset INTEGER,
  end_offset INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_text_highlights_student ON text_highlights(student_id);
CREATE INDEX idx_text_highlights_section ON text_highlights(section_id);
-- ─── Quiz Responses ────────────────────────────────────────

CREATE TABLE quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES lesson_sections(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quiz_responses_student ON quiz_responses(student_id);
CREATE INDEX idx_quiz_responses_section ON quiz_responses(section_id);
-- ─── Student Library Items ─────────────────────────────────

CREATE TABLE student_library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tutor_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type library_item_type NOT NULL,
  url TEXT,
  subject TEXT,
  tutor_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_student_library_student ON student_library_items(student_id);
-- ─── Games ─────────────────────────────────────────────────

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category game_category NOT NULL,
  description TEXT,
  embed_url TEXT,
  link_url TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_games_category ON games(category);
CREATE INDEX idx_games_default ON games(is_default) WHERE is_default = true;
-- ─── Student Game Favorites ────────────────────────────────

CREATE TABLE student_game_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, game_id)
);
CREATE INDEX idx_game_favorites_student ON student_game_favorites(student_id);
-- ─── Student Settings (font size, TTS, color theme) ────────

CREATE TABLE student_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  display_name TEXT,
  font_size TEXT NOT NULL DEFAULT 'normal' CHECK (font_size IN ('normal', 'large', 'extra-large')),
  tts_enabled BOOLEAN NOT NULL DEFAULT false,
  color_theme TEXT NOT NULL DEFAULT 'standard' CHECK (color_theme IN ('standard', 'high-contrast')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER set_student_settings_updated_at
  BEFORE UPDATE ON student_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_game_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_settings ENABLE ROW LEVEL SECURITY;
-- Lessons: tutor can CRUD their own, students can read theirs
CREATE POLICY "Tutors manage their lessons"
  ON lessons FOR ALL
  USING (tutor_profile_id = auth.uid());
-- Students access lessons through server actions, not direct client calls.
-- The app layer validates student identity via session tokens.
-- This permissive policy allows server-side reads for any published lesson.
CREATE POLICY "Published lessons are readable"
  ON lessons FOR SELECT
  USING (status = 'published');
-- Lesson sections: tutor can CRUD, students can read via lesson
CREATE POLICY "Tutors manage lesson sections"
  ON lesson_sections FOR ALL
  USING (
    lesson_id IN (
      SELECT id FROM lessons WHERE tutor_profile_id = auth.uid()
    )
  );
CREATE POLICY "Students read lesson sections"
  ON lesson_sections FOR SELECT
  USING (
    lesson_id IN (
      SELECT id FROM lessons WHERE status = 'published'
    )
  );
-- Progress: students write their own, tutors read their students'
CREATE POLICY "Students manage their progress"
  ON lesson_progress FOR ALL
  USING (true);
CREATE POLICY "Tutors read student progress"
  ON lesson_progress FOR SELECT
  USING (
    student_id IN (
      SELECT student_id FROM lessons WHERE tutor_profile_id = auth.uid()
    )
  );
-- Highlights: students write their own
CREATE POLICY "Students manage their highlights"
  ON text_highlights FOR ALL
  USING (true);
-- Quiz responses: students write, tutors read
CREATE POLICY "Students submit quiz responses"
  ON quiz_responses FOR ALL
  USING (true);
CREATE POLICY "Tutors read quiz responses"
  ON quiz_responses FOR SELECT
  USING (
    student_id IN (
      SELECT student_id FROM lessons WHERE tutor_profile_id = auth.uid()
    )
  );
-- Library items: tutors CRUD, students read their own
CREATE POLICY "Tutors manage library items"
  ON student_library_items FOR ALL
  USING (tutor_profile_id = auth.uid());
CREATE POLICY "Students read their library"
  ON student_library_items FOR SELECT
  USING (true);
-- Games: everyone reads, nobody writes via API (seeded by migration)
CREATE POLICY "Anyone reads games"
  ON games FOR SELECT
  USING (true);
-- Game favorites: students manage their own
CREATE POLICY "Students manage game favorites"
  ON student_game_favorites FOR ALL
  USING (true);
-- Student settings: students manage their own
CREATE POLICY "Students manage their settings"
  ON student_settings FOR ALL
  USING (true);
-- ============================================================
-- Seed default games
-- ============================================================

INSERT INTO games (title, category, description, embed_url, link_url, is_default) VALUES
  ('Prodigy', 'math', 'Adventure-style math game with quests and battles', NULL, 'https://www.prodigygame.com', true),
  ('IXL', 'math', 'Practice math and reading skills with adaptive questions', NULL, 'https://www.ixl.com', true),
  ('Blooket', 'fun', 'Play quiz-based games in many subjects', NULL, 'https://www.blooket.com', true),
  ('Kahoot', 'fun', 'Interactive quiz games for all subjects', NULL, 'https://kahoot.com', true),
  ('ABCya', 'reading', 'Educational games for elementary students', NULL, 'https://www.abcya.com', true),
  ('Funbrain', 'reading', 'Reading and math games with books and videos', NULL, 'https://www.funbrain.com', true),
  ('Starfall', 'reading', 'Learn phonics and reading fundamentals', NULL, 'https://www.starfall.com', true),
  ('Gimkit', 'fun', 'Game show-style learning platform', NULL, 'https://www.gimkit.com', true),
  ('Typing.com', 'writing', 'Learn to type with fun lessons and games', NULL, 'https://www.typing.com', true),
  ('Scratch', 'logic', 'Create stories, games, and animations with code', NULL, 'https://scratch.mit.edu', true);

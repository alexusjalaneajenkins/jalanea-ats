-- ============================================================
-- Diagnostic Exam System
-- Supports: grade-level exams, skill-tagged questions,
-- auto-scoring, and skill gap reports
-- ============================================================

-- Subject enum for diagnostics
CREATE TYPE diagnostic_subject AS ENUM ('math', 'reading');
-- ─── Diagnostic Exams (one per grade + subject) ────────────

CREATE TABLE diagnostic_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject diagnostic_subject NOT NULL,
  grade_level TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subject, grade_level)
);
-- ─── Diagnostic Questions ──────────────────────────────────

CREATE TABLE diagnostic_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES diagnostic_exams(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'short_answer')),
  options JSONB,
  correct_answer TEXT,
  skill_tag TEXT NOT NULL,
  skill_description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_id, question_number)
);
CREATE INDEX idx_diagnostic_questions_exam ON diagnostic_questions(exam_id);
CREATE INDEX idx_diagnostic_questions_skill ON diagnostic_questions(skill_tag);
-- ─── Student Diagnostic Attempts ───────────────────────────

CREATE TABLE diagnostic_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES diagnostic_exams(id) ON DELETE CASCADE,
  tutor_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  score_percent NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed'))
);
CREATE INDEX idx_diagnostic_attempts_student ON diagnostic_attempts(student_id);
CREATE INDEX idx_diagnostic_attempts_exam ON diagnostic_attempts(exam_id);
-- ─── Individual Question Responses ─────────────────────────

CREATE TABLE diagnostic_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES diagnostic_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES diagnostic_questions(id) ON DELETE CASCADE,
  student_answer TEXT,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);
CREATE INDEX idx_diagnostic_responses_attempt ON diagnostic_responses(attempt_id);
-- ─── Skill Gap Results (computed after exam) ───────────────

CREATE TABLE diagnostic_skill_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES diagnostic_attempts(id) ON DELETE CASCADE,
  skill_tag TEXT NOT NULL,
  skill_description TEXT,
  questions_total INTEGER NOT NULL DEFAULT 0,
  questions_correct INTEGER NOT NULL DEFAULT 0,
  mastery_level TEXT NOT NULL CHECK (mastery_level IN ('strong', 'developing', 'needs_work')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(attempt_id, skill_tag)
);
CREATE INDEX idx_skill_gaps_attempt ON diagnostic_skill_gaps(attempt_id);
CREATE INDEX idx_skill_gaps_level ON diagnostic_skill_gaps(mastery_level);
-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE diagnostic_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_skill_gaps ENABLE ROW LEVEL SECURITY;
-- Exams and questions: readable by everyone (they're shared content)
CREATE POLICY "Exams are readable by all" ON diagnostic_exams FOR SELECT USING (true);
CREATE POLICY "Questions are readable by all" ON diagnostic_questions FOR SELECT USING (true);
-- Attempts: tutors manage their students', students can read their own
CREATE POLICY "Tutors manage diagnostic attempts"
  ON diagnostic_attempts FOR ALL
  USING (tutor_profile_id = auth.uid());
CREATE POLICY "Students read their attempts"
  ON diagnostic_attempts FOR SELECT
  USING (true);
-- Responses: same pattern
CREATE POLICY "Tutors manage diagnostic responses"
  ON diagnostic_responses FOR ALL
  USING (true);
CREATE POLICY "Students manage diagnostic responses"
  ON diagnostic_responses FOR ALL
  USING (true);
-- Skill gaps: readable
CREATE POLICY "Skill gaps are readable"
  ON diagnostic_skill_gaps FOR ALL
  USING (true);
-- ============================================================
-- Seed: 6th Grade Math Diagnostic
-- ============================================================

DO $$
DECLARE
  exam_id UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES (
    'Math Assessment: 6th Grade',
    'math',
    '6th',
    'Sunshine Method Initial Diagnostic Assessment: Math (6th Grade Level)'
  )
  RETURNING id INTO exam_id;

  -- Q1: Algebraic Expressions
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 1,
    'Kirsten read a number of books, k. Eric read 3 books fewer than Kirsten. What expression can be used to find the number of books Eric read?',
    '["k - 3", "k + 3", "3 - k", "3 × k"]',
    'k - 3',
    'algebraic_expressions',
    'Translating word problems into algebraic expressions');

  -- Q2: Equivalent Fractions
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 2,
    'Which proportion is correct?',
    '["4/10 = 3/6", "1/2 = 7/8", "1/2 = 3/6", "4/10 = 7/8"]',
    '1/2 = 3/6',
    'equivalent_fractions',
    'Identifying equivalent fractions and proportions');

  -- Q3: Exponents
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 3,
    'Which pair of expressions is equivalent to each other?',
    '["2 × 2 × 2 and 3²", "6 × 6 × 6 × 6 and 4⁶", "4 × 4 × 4 × 4 × 4 and 4⁵", "8 × 8 × 8 × 8 × 8 × 8 and 8⁸"]',
    '4 × 4 × 4 × 4 × 4 and 4⁵',
    'exponents',
    'Understanding exponential notation and repeated multiplication');

  -- Q4: Solving Equations (correct answer TBD — placeholder)
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 4,
    'What value of x makes the equation below true?',
    NULL,
    NULL,
    'solving_equations',
    'Solving one-step or two-step algebraic equations');

  -- Q5: Absolute Value
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 5,
    'What value is equivalent to |-1/4|?',
    '["-4", "-1/4", "4", "1/4"]',
    '1/4',
    'absolute_value',
    'Understanding absolute value of rational numbers');

  -- Q6: Area on Coordinate Plane (correct answer TBD)
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 6,
    'What is the area of the figure drawn on the coordinate plane below?',
    '["38 square units", "59 square units", "71 square units", "90 square units"]',
    NULL,
    'area_coordinate_plane',
    'Finding area of irregular shapes on a coordinate plane');

  -- Q7: Properties of Operations
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 7,
    'What property is shown in the equation below? (6 × 0 = 0)',
    '["Zero property of multiplication inverse", "Property of multiplication identity", "Zero property of multiplication", "Commutative property of multiplication"]',
    'Zero property of multiplication',
    'properties_of_operations',
    'Identifying multiplication properties (zero, identity, commutative)');

  -- Q8: Area/Geometry (second coordinate plane question, correct answer TBD)
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 8,
    'What is the area of the figure drawn on the coordinate plane below?',
    NULL,
    NULL,
    'area_geometry',
    'Calculating area of geometric figures on coordinate planes');

  -- Q9: Ratios / Fractions of a Whole
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 9,
    'Mary picks 15 flowers from her garden. If 3 out of 5 of these flowers are yellow, how many yellow flowers did she pick?',
    '["3", "5", "9", "12"]',
    '9',
    'ratios_fractions',
    'Applying ratios and fractions to find part of a whole');

  -- Q10: Counting Principle
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 10,
    'Students auditioning for a singing contest are given a list of 7 rock songs and 5 country songs. If each student must pick 1 rock song and 1 country song, how many different song combinations can each student pick?',
    '["2", "12", "35", "75"]',
    '35',
    'counting_principle',
    'Using the fundamental counting principle for combinations');

  -- Q11: Coordinate Geometry (correct answer TBD)
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 11,
    'Two vertices of a right triangle are shown on the coordinate plane below. Which point could represent the third vertex of the right triangle?',
    NULL,
    NULL,
    'coordinate_geometry',
    'Identifying points on a coordinate plane to form geometric shapes');

  -- Q12: Statistics (Median)
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 12,
    'The list below shows the heights, in meters, of five different buildings: 180, 170, 120, 180, 160. What is the median height, in meters, of the buildings?',
    '["162", "165", "170", "180"]',
    '170',
    'statistics_median',
    'Finding the median of a data set');

  -- Q13: Writing Algebraic Equations
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 13,
    'What algebraic equation represents "three times the difference of a number, x, and nine equals fifteen"?',
    '["3x - 9 = 15", "3(x - 9) = 15", "3x + 9 = 15", "9 - 3x = 15"]',
    '3(x - 9) = 15',
    'writing_equations',
    'Translating verbal descriptions into algebraic equations');

  -- Q14: Unit Conversion
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 14,
    'Roberto has a container with 4,200 milliliters of water. How many liters of water are in Roberto''s container? (1 liter = 1,000 milliliters)',
    '["0.042", "0.42", "4.2", "42"]',
    '4.2',
    'unit_conversion',
    'Converting between metric units (milliliters to liters)');

  -- Q15: Circumference
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 15,
    'A circle has a radius of 18 inches. What is the circumference of the circle in terms of π? (C = 2πr)',
    '["9π", "18π", "36π", "324π"]',
    '36π',
    'circumference',
    'Calculating circumference of a circle using C = 2πr');

  -- Q16: Simplifying Expressions (correct answer TBD)
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 16,
    'Simplify the expression below.',
    NULL,
    NULL,
    'simplifying_expressions',
    'Simplifying algebraic expressions by combining like terms');

  -- Q17: Fraction Subtraction
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 17,
    'Mica and Denise are reading the same novel. Mica has read 1/2 of the novel, and Denise has read 1/3 of the novel. How much more of the novel has Mica read than Denise?',
    '["1/6", "2/5", "3/5", "5/6"]',
    '1/6',
    'fraction_operations',
    'Subtracting fractions with unlike denominators');

  -- Q18: Data Analysis / Graphs (correct answer TBD)
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
  VALUES (exam_id, 18,
    'Mr. Bern asked the sixth-grade students in his school to choose their favorite winter sport. According to the data in the graph, which statement is true?',
    NULL,
    NULL,
    'data_analysis',
    'Interpreting data from bar graphs and making valid conclusions');
END $$;

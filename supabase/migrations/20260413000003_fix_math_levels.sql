-- Fix misaligned math diagnostic questions based on Common Core verification
-- Issues found: 7 questions across 6 grades testing below/above grade level

-- ============================================================
-- 2ND GRADE: Q6 tests multiplication (3rd grade skill)
-- Fix: Rewrite as repeated addition, which is grade-appropriate
-- ============================================================
UPDATE diagnostic_questions
SET prompt = 'There are 4 boxes. Each box has 2 crayons. How many crayons are there in all? (Hint: 2 + 2 + 2 + 2)',
    options = '["6", "8", "10", "4"]'::jsonb,
    correct_answer = '8',
    skill_tag = 'repeated_addition'
WHERE skill_tag = 'intro_multiplication'
  AND exam_id = (SELECT id FROM diagnostic_exams WHERE grade_level = '2nd' AND subject = 'math');
-- ============================================================
-- 3RD GRADE: Q10 tests telling time to half hour (2nd grade skill)
-- Fix: Replace with area of rectangles (3.MD.7)
-- ============================================================
UPDATE diagnostic_questions
SET prompt = 'A rectangle is 5 units long and 3 units wide. What is its area?',
    options = '["8 square units", "15 square units", "16 square units", "10 square units"]'::jsonb,
    correct_answer = '15 square units',
    skill_tag = 'area_of_rectangles'
WHERE skill_tag = 'telling_time_half_hour'
  AND exam_id = (SELECT id FROM diagnostic_exams WHERE grade_level = '3rd' AND subject = 'math');
-- ============================================================
-- 9TH GRADE (Algebra 1): Q6 tests domain of rational function (Algebra 2)
-- Fix: Test domain of a square root function (intro level, appropriate for Alg 1)
-- ============================================================
UPDATE diagnostic_questions
SET prompt = 'What values of x make the expression sqrt(x) defined? (What is the domain?)',
    options = '["All real numbers", "x >= 0", "x > 0", "x <= 0"]'::jsonb,
    correct_answer = 'x >= 0',
    skill_tag = 'domain_of_functions'
WHERE skill_tag = 'domain_of_functions'
  AND exam_id = (SELECT id FROM diagnostic_exams WHERE grade_level = '9th' AND subject = 'math');
-- ============================================================
-- 10TH GRADE (Geometry): Q10 asks polygon names (3rd-5th grade skill)
-- Fix: Replace with triangle congruence (G-SRT)
-- ============================================================
UPDATE diagnostic_questions
SET prompt = 'Two triangles have two sides and the angle between them equal. Which congruence rule applies?',
    options = '["SSS", "SAS", "ASA", "AAS"]'::jsonb,
    correct_answer = 'SAS',
    skill_tag = 'triangle_congruence'
WHERE skill_tag = 'polygon_names'
  AND exam_id = (SELECT id FROM diagnostic_exams WHERE grade_level = '10th' AND subject = 'math');
-- ============================================================
-- 11TH GRADE (Algebra 2): Q1 tests basic quadratic factoring (Algebra 1)
-- Fix: Replace with polynomial long division
-- ============================================================
UPDATE diagnostic_questions
SET prompt = 'Divide: (x^3 + 2x^2 - 5x - 6) / (x + 1). What is the quotient?',
    options = '["x^2 + x - 6", "x^2 + 3x - 6", "x^2 - x + 6", "x^2 + x + 6"]'::jsonb,
    correct_answer = 'x^2 + x - 6',
    skill_tag = 'polynomial_division'
WHERE skill_tag = 'quadratic_equations'
  AND question_number = 1
  AND exam_id = (SELECT id FROM diagnostic_exams WHERE grade_level = '11th' AND subject = 'math');
-- 11TH GRADE: Q6 tests vertex form (Algebra 1)
-- Fix: Replace with solving logarithmic equations
UPDATE diagnostic_questions
SET prompt = 'Solve for x: log_2(x) = 5',
    options = '["10", "25", "32", "64"]'::jsonb,
    correct_answer = '32',
    skill_tag = 'solving_logarithms'
WHERE skill_tag = 'vertex_form'
  AND exam_id = (SELECT id FROM diagnostic_exams WHERE grade_level = '11th' AND subject = 'math');
-- ============================================================
-- 12TH GRADE (Pre-Calc/Calc): Q10 tests factoring cubes (Algebra 2)
-- Fix: Replace with chain rule application
-- ============================================================
UPDATE diagnostic_questions
SET prompt = 'Find the derivative of f(x) = (3x + 1)^4 using the chain rule.',
    options = '["4(3x + 1)^3", "12(3x + 1)^3", "3(3x + 1)^3", "12(3x + 1)^4"]'::jsonb,
    correct_answer = '12(3x + 1)^3',
    skill_tag = 'chain_rule'
WHERE skill_tag = 'factoring_cubes'
  AND exam_id = (SELECT id FROM diagnostic_exams WHERE grade_level = '12th' AND subject = 'math');
-- 12TH GRADE: Q11 tests range of x^2 (Algebra 1-2)
-- Fix: Replace with evaluating a definite integral
UPDATE diagnostic_questions
SET prompt = 'Evaluate the definite integral: integral from 0 to 2 of (3x^2) dx',
    options = '["6", "8", "12", "4"]'::jsonb,
    correct_answer = '8',
    skill_tag = 'definite_integrals'
WHERE skill_tag = 'range_of_functions'
  AND exam_id = (SELECT id FROM diagnostic_exams WHERE grade_level = '12th' AND subject = 'math');

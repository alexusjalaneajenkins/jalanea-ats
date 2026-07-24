-- Fix the 5 questions in 6th grade math that have empty options and no answers.
-- These were originally image-dependent questions from the PDF diagnostic.
-- Replace with proper text-based multiple choice questions.

-- Q4: was "What value of x makes the equation true?" (no image)
UPDATE diagnostic_questions
SET prompt = 'What value of x makes the equation true: 3x = 18?',
    options = '["3", "6", "15", "54"]'::jsonb,
    correct_answer = '6',
    question_type = 'multiple_choice',
    skill_tag = 'solving_equations'
WHERE exam_id = '673ae47f-ebd7-4d6f-9879-15d3117bf44a'
  AND question_number = 4;
-- Q6: was area on coordinate plane (no grid image)
UPDATE diagnostic_questions
SET prompt = 'A rectangle has a length of 8 units and a width of 5 units. What is its area?',
    options = '["13 square units", "26 square units", "40 square units", "45 square units"]'::jsonb,
    correct_answer = '40 square units',
    question_type = 'multiple_choice',
    skill_tag = 'area_of_rectangles'
WHERE exam_id = '673ae47f-ebd7-4d6f-9879-15d3117bf44a'
  AND question_number = 6;
-- Q8: was area on coordinate plane (2nd, no grid image)
UPDATE diagnostic_questions
SET prompt = 'A triangle has a base of 10 units and a height of 6 units. What is its area?',
    options = '["16 square units", "30 square units", "60 square units", "36 square units"]'::jsonb,
    correct_answer = '30 square units',
    question_type = 'multiple_choice',
    skill_tag = 'area_of_triangles'
WHERE exam_id = '673ae47f-ebd7-4d6f-9879-15d3117bf44a'
  AND question_number = 8;
-- Q11: was "Third vertex of right triangle on coordinate plane" (no grid)
UPDATE diagnostic_questions
SET prompt = 'Two vertices of a right triangle are at (1, 1) and (1, 5). The right angle is at (1, 1). Where could the third vertex be?',
    options = '["(1, 3)", "(5, 1)", "(3, 3)", "(0, 0)"]'::jsonb,
    correct_answer = '(5, 1)',
    question_type = 'multiple_choice',
    skill_tag = 'coordinate_geometry'
WHERE exam_id = '673ae47f-ebd7-4d6f-9879-15d3117bf44a'
  AND question_number = 11;
-- Q16: was "Simplify the expression" (no expression shown)
UPDATE diagnostic_questions
SET prompt = 'Simplify: 4(2x + 3) - 2x',
    options = '["6x + 12", "8x + 3", "6x + 3", "10x + 12"]'::jsonb,
    correct_answer = '6x + 12',
    question_type = 'multiple_choice',
    skill_tag = 'simplifying_expressions'
WHERE exam_id = '673ae47f-ebd7-4d6f-9879-15d3117bf44a'
  AND question_number = 16;
-- Q18: was bar graph interpretation (no image)
UPDATE diagnostic_questions
SET prompt = 'A bar graph shows: Soccer has 12 votes, Basketball has 8 votes, Baseball has 5 votes, Tennis has 3 votes. How many more students chose Soccer than Baseball?',
    options = '["4", "7", "9", "17"]'::jsonb,
    correct_answer = '7',
    question_type = 'multiple_choice',
    skill_tag = 'data_analysis'
WHERE exam_id = '673ae47f-ebd7-4d6f-9879-15d3117bf44a'
  AND question_number = 18;

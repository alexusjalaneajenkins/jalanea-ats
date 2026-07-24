-- ============================================================
-- Seed ALL Diagnostic Exams: Grades 1-12, Math + Reading
-- ~264 questions total, each tagged to a specific skill
-- ============================================================

-- Helper: insert exam + questions in one DO block per grade
-- Pattern: create exam, then insert questions referencing it

-- ============================================================
-- 1ST GRADE MATH
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Math Assessment: 1st Grade', 'math', '1st', 'Diagnostic assessment for 1st grade math skills')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What is 5 + 3?', '["6", "7", "8", "9"]', '8', 'addition_within_20', 'Adding single-digit numbers'),
  (eid, 2, 'What is 9 - 4?', '["3", "4", "5", "6"]', '5', 'subtraction_within_20', 'Subtracting single-digit numbers'),
  (eid, 3, 'Which number comes after 15?', '["14", "15", "16", "17"]', '16', 'counting_sequence', 'Counting and number sequence'),
  (eid, 4, 'What is 7 + 6?', '["11", "12", "13", "14"]', '13', 'addition_within_20', 'Adding single-digit numbers with regrouping'),
  (eid, 5, 'Which is greater: 12 or 9?', '["12", "9", "They are equal", "Cannot tell"]', '12', 'comparing_numbers', 'Comparing two-digit numbers'),
  (eid, 6, 'There are 8 apples. You eat 3. How many are left?', '["3", "4", "5", "6"]', '5', 'subtraction_word_problems', 'Subtraction word problems'),
  (eid, 7, 'What is 10 + 5?', '["14", "15", "16", "17"]', '15', 'addition_with_ten', 'Adding to ten'),
  (eid, 8, 'How many sides does a triangle have?', '["2", "3", "4", "5"]', '3', 'basic_shapes', 'Identifying basic shapes'),
  (eid, 9, 'Which number is between 6 and 8?', '["5", "6", "7", "9"]', '7', 'number_order', 'Understanding number order'),
  (eid, 10, 'You have 4 red balls and 3 blue balls. How many balls do you have?', '["5", "6", "7", "8"]', '7', 'addition_word_problems', 'Addition word problems');
END $$;
-- ============================================================
-- 1ST GRADE READING
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Reading Assessment: 1st Grade', 'reading', '1st', 'Diagnostic assessment for 1st grade reading skills')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'Read the sentence: "The cat sat on the mat." Where did the cat sit?', '["On the bed", "On the mat", "On the chair", "On the floor"]', 'On the mat', 'reading_comprehension', 'Understanding details in a sentence'),
  (eid, 2, 'Which word rhymes with "hat"?', '["hot", "hit", "cat", "hut"]', 'cat', 'phonics_rhyming', 'Identifying rhyming words'),
  (eid, 3, 'Read: "Sam has a big red dog. The dog likes to run." What color is the dog?', '["Brown", "Black", "Red", "White"]', 'Red', 'detail_recall', 'Recalling details from a short passage'),
  (eid, 4, 'Which word begins with the same sound as "ball"?', '["dog", "bat", "cat", "sun"]', 'bat', 'beginning_sounds', 'Identifying beginning letter sounds'),
  (eid, 5, 'Read: "It was raining outside. Mia took her umbrella." Why did Mia take her umbrella?', '["It was sunny", "It was raining", "It was snowing", "She was bored"]', 'It was raining', 'cause_and_effect', 'Understanding cause and effect'),
  (eid, 6, 'How many syllables are in the word "happy"?', '["1", "2", "3", "4"]', '2', 'syllable_counting', 'Counting syllables in words'),
  (eid, 7, 'Read: "The bird flew to the tree. It sang a song." What did the bird do?', '["Swam in the lake", "Flew and sang", "Ran on the ground", "Slept in a nest"]', 'Flew and sang', 'sequence_of_events', 'Understanding sequence of events'),
  (eid, 8, 'What is the opposite of "big"?', '["tall", "small", "wide", "long"]', 'small', 'vocabulary_antonyms', 'Understanding opposite words');
END $$;
-- ============================================================
-- 2ND GRADE MATH
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Math Assessment: 2nd Grade', 'math', '2nd', 'Diagnostic assessment for 2nd grade math skills')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What is 24 + 13?', '["35", "36", "37", "38"]', '37', 'two_digit_addition', 'Adding two-digit numbers without regrouping'),
  (eid, 2, 'What is 45 - 21?', '["22", "23", "24", "25"]', '24', 'two_digit_subtraction', 'Subtracting two-digit numbers'),
  (eid, 3, 'What is 38 + 27?', '["55", "65", "66", "56"]', '65', 'addition_with_regrouping', 'Adding two-digit numbers with regrouping'),
  (eid, 4, 'Which number is even: 7, 10, 13, 15?', '["7", "10", "13", "15"]', '10', 'odd_even', 'Identifying odd and even numbers'),
  (eid, 5, 'What time does the clock show if the big hand is on 12 and the small hand is on 3?', '["12:00", "3:00", "6:00", "9:00"]', '3:00', 'telling_time', 'Reading a clock to the hour'),
  (eid, 6, 'There are 3 groups of 4 pencils. How many pencils are there?', '["7", "10", "12", "15"]', '12', 'intro_multiplication', 'Understanding equal groups'),
  (eid, 7, 'What is the value of the 5 in 52?', '["5", "50", "500", "2"]', '50', 'place_value_tens', 'Understanding tens place value'),
  (eid, 8, 'Which shape has 4 equal sides?', '["Triangle", "Rectangle", "Square", "Circle"]', 'Square', 'geometry_shapes', 'Identifying shapes by properties'),
  (eid, 9, 'What is 63 - 28?', '["35", "45", "34", "36"]', '35', 'subtraction_with_regrouping', 'Subtracting with regrouping'),
  (eid, 10, 'A toy costs 50 cents. You pay with a dollar. How much change do you get?', '["25 cents", "50 cents", "75 cents", "10 cents"]', '50 cents', 'money_concepts', 'Working with money and making change');
END $$;
-- ============================================================
-- 2ND GRADE READING
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Reading Assessment: 2nd Grade', 'reading', '2nd', 'Diagnostic assessment for 2nd grade reading skills')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'Read: "Jake woke up early. He brushed his teeth and ate breakfast. Then he walked to school." What did Jake do first?', '["Walked to school", "Ate breakfast", "Woke up early", "Brushed his teeth"]', 'Woke up early', 'sequence_of_events', 'Ordering events in a story'),
  (eid, 2, 'Read: "The puppy wagged its tail when it saw Maria." How did the puppy feel?', '["Sad", "Happy", "Scared", "Angry"]', 'Happy', 'making_inferences', 'Making inferences about feelings'),
  (eid, 3, 'What does the word "enormous" mean?', '["Very small", "Very fast", "Very big", "Very old"]', 'Very big', 'vocabulary_context', 'Understanding vocabulary from context'),
  (eid, 4, 'Read: "Lina planted a seed. She watered it every day. After two weeks, a small green plant appeared." What is this passage mostly about?', '["Cooking food", "Growing a plant", "Going to school", "Playing outside"]', 'Growing a plant', 'main_idea', 'Identifying the main idea'),
  (eid, 5, 'Read: "The wind blew hard. Leaves flew everywhere. Dark clouds filled the sky." What is the weather like?', '["Sunny", "Stormy", "Snowy", "Calm"]', 'Stormy', 'drawing_conclusions', 'Drawing conclusions from details'),
  (eid, 6, 'Which word is a noun?', '["run", "happy", "dog", "quickly"]', 'dog', 'parts_of_speech', 'Identifying nouns'),
  (eid, 7, 'Read: "First, mix the flour and sugar. Next, add the eggs. Last, bake for 30 minutes." What kind of writing is this?', '["A story", "A poem", "Instructions", "A letter"]', 'Instructions', 'text_structure', 'Recognizing types of writing'),
  (eid, 8, 'Read: "Ben did not study for his test. He got a low score." What lesson can we learn?', '["Studying is not important", "You should study for tests", "Tests are easy", "Ben is smart"]', 'You should study for tests', 'theme_lesson', 'Understanding the lesson of a story');
END $$;
-- ============================================================
-- 3RD GRADE MATH
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Math Assessment: 3rd Grade', 'math', '3rd', 'Diagnostic assessment for 3rd grade math skills')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What is 6 x 7?', '["36", "42", "48", "35"]', '42', 'multiplication_facts', 'Multiplication facts within 100'),
  (eid, 2, 'What is 56 / 8?', '["6", "7", "8", "9"]', '7', 'division_facts', 'Division facts within 100'),
  (eid, 3, 'What fraction of the pizza is shaded if 2 out of 4 slices are shaded?', '["1/4", "2/4", "3/4", "4/4"]', '2/4', 'intro_fractions', 'Understanding fractions as parts of a whole'),
  (eid, 4, 'What is 345 + 278?', '["613", "623", "523", "633"]', '623', 'three_digit_addition', 'Adding three-digit numbers'),
  (eid, 5, 'Round 67 to the nearest ten.', '["60", "65", "70", "80"]', '70', 'rounding', 'Rounding to the nearest ten'),
  (eid, 6, 'What is the perimeter of a rectangle that is 5 cm long and 3 cm wide?', '["8 cm", "15 cm", "16 cm", "30 cm"]', '16 cm', 'perimeter', 'Calculating perimeter of rectangles'),
  (eid, 7, 'Which fraction is larger: 1/3 or 1/2?', '["1/3", "1/2", "They are equal", "Cannot tell"]', '1/2', 'comparing_fractions', 'Comparing fractions with different denominators'),
  (eid, 8, 'There are 4 rows of desks with 6 desks in each row. How many desks are there?', '["10", "18", "24", "28"]', '24', 'multiplication_word_problems', 'Solving multiplication word problems'),
  (eid, 9, 'What is 800 - 356?', '["444", "454", "544", "446"]', '444', 'three_digit_subtraction', 'Subtracting three-digit numbers'),
  (eid, 10, 'What time is it if the big hand is on 6 and the small hand is between 2 and 3?', '["2:00", "2:30", "3:00", "6:02"]', '2:30', 'telling_time_half_hour', 'Reading a clock to the half hour');
END $$;
-- ============================================================
-- 3RD GRADE READING
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Reading Assessment: 3rd Grade', 'reading', '3rd', 'Diagnostic assessment for 3rd grade reading skills')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'Read: "The fox looked at the grapes high up on the vine. He jumped and jumped but could not reach them. He walked away and said, ''Those grapes are probably sour anyway.''" Why did the fox say the grapes were sour?', '["He tasted them", "He could not reach them", "Someone told him", "They were green"]', 'He could not reach them', 'character_motivation', 'Understanding why characters act the way they do'),
  (eid, 2, 'What is the main idea of a story about a girl who practices piano every day and wins a contest?', '["Piano is boring", "Practice helps you improve", "Contests are scary", "Girls like music"]', 'Practice helps you improve', 'main_idea', 'Identifying the central message'),
  (eid, 3, 'Read: "The leaves turned orange and red. The air felt cool. Squirrels gathered nuts." What season is it?', '["Spring", "Summer", "Fall", "Winter"]', 'Fall', 'inference_from_context', 'Making inferences using context clues'),
  (eid, 4, 'What does "exhausted" most likely mean? "After running 5 miles, Tara was exhausted."', '["Excited", "Very tired", "Very hungry", "Happy"]', 'Very tired', 'vocabulary_in_context', 'Using context clues to determine word meaning'),
  (eid, 5, 'Read: "Step 1: Gather your supplies. Step 2: Cut the paper. Step 3: Glue the pieces together." What type of text is this?', '["Fiction story", "Poem", "How-to instructions", "Biography"]', 'How-to instructions', 'text_type', 'Identifying different types of texts'),
  (eid, 6, 'What is the setting of a story?', '["The main character", "Where and when the story takes place", "The problem in the story", "The ending"]', 'Where and when the story takes place', 'story_elements', 'Understanding story elements'),
  (eid, 7, 'Read: "Maya studied hard for her spelling test. On test day, she got every word right." What is the effect of Maya studying hard?', '["She forgot the words", "She got every word right", "She missed the test", "She felt tired"]', 'She got every word right', 'cause_and_effect', 'Identifying cause and effect relationships'),
  (eid, 8, 'Which sentence is an opinion?', '["Dogs have four legs.", "Water freezes at 32 degrees.", "Pizza is the best food.", "The sun is a star."]', 'Pizza is the best food.', 'fact_vs_opinion', 'Distinguishing between fact and opinion');
END $$;
-- ============================================================
-- 4TH GRADE MATH
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Math Assessment: 4th Grade', 'math', '4th', 'Diagnostic assessment for 4th grade math skills')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What is 4,567 + 2,389?', '["6,856", "6,956", "6,946", "7,056"]', '6,956', 'multi_digit_addition', 'Adding multi-digit whole numbers'),
  (eid, 2, 'What is 8 x 12?', '["86", "88", "96", "98"]', '96', 'multi_digit_multiplication', 'Multiplying by two-digit numbers'),
  (eid, 3, 'Which fraction is equivalent to 2/4?', '["1/3", "1/2", "2/3", "3/4"]', '1/2', 'equivalent_fractions', 'Finding equivalent fractions'),
  (eid, 4, 'What is the area of a rectangle that is 8 cm long and 5 cm wide?', '["13 cm", "26 cm", "40 sq cm", "80 sq cm"]', '40 sq cm', 'area_of_rectangles', 'Calculating area of rectangles'),
  (eid, 5, 'Round 3,847 to the nearest hundred.', '["3,800", "3,850", "3,900", "4,000"]', '3,800', 'rounding_thousands', 'Rounding to the nearest hundred'),
  (eid, 6, 'What is 7,000 - 2,453?', '["4,447", "4,547", "4,557", "5,547"]', '4,547', 'multi_digit_subtraction', 'Subtracting multi-digit numbers'),
  (eid, 7, '3/8 + 2/8 = ?', '["5/16", "5/8", "6/8", "1/8"]', '5/8', 'adding_fractions_same_denom', 'Adding fractions with like denominators'),
  (eid, 8, 'A book has 156 pages. Maria reads 12 pages each day. How many days will it take her to finish?', '["12", "13", "14", "15"]', '13', 'division_word_problems', 'Solving division word problems'),
  (eid, 9, 'Which angle is a right angle?', '["45 degrees", "90 degrees", "120 degrees", "180 degrees"]', '90 degrees', 'angles', 'Identifying types of angles'),
  (eid, 10, 'What is 23 x 15?', '["335", "340", "345", "350"]', '345', 'two_by_two_multiplication', 'Multiplying two-digit by two-digit numbers'),
  (eid, 11, 'Write 0.7 as a fraction.', '["7/100", "7/10", "70/10", "1/7"]', '7/10', 'decimals_to_fractions', 'Converting decimals to fractions'),
  (eid, 12, 'A garden has 3 rows of flowers with 9 flowers in each row, plus 4 extra flowers. How many flowers total?', '["27", "30", "31", "36"]', '31', 'multi_step_word_problems', 'Solving multi-step word problems');
END $$;
-- ============================================================
-- 4TH GRADE READING
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Reading Assessment: 4th Grade', 'reading', '4th', 'Diagnostic assessment for 4th grade reading skills')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'Read: "The South Pole explorers faced bitter cold, deep snow, and fierce winds. Despite the danger, they pushed forward." What does "fierce" most likely mean?', '["Gentle", "Very strong", "Quiet", "Warm"]', 'Very strong', 'vocabulary_in_context', 'Determining word meaning from context'),
  (eid, 2, 'What is the difference between a first-person narrator and a third-person narrator?', '["First person uses I/me, third person uses he/she/they", "First person is always true, third person is fiction", "There is no difference", "First person is past tense only"]', 'First person uses I/me, third person uses he/she/they', 'point_of_view', 'Identifying narrative point of view'),
  (eid, 3, 'Read: "Ants work together to build their colonies. Each ant has a specific job. Some gather food, some protect the nest, and the queen lays eggs." What is the main idea?', '["Queens are lazy", "Ants work alone", "Ants work together with different jobs", "Ants only eat food"]', 'Ants work together with different jobs', 'main_idea_nonfiction', 'Identifying the main idea in nonfiction'),
  (eid, 4, 'What text feature would help you find the meaning of a word in a textbook?', '["Table of contents", "Index", "Glossary", "Chapter title"]', 'Glossary', 'text_features', 'Using text features to locate information'),
  (eid, 5, 'Read: "The boy crossed his arms and frowned. He stomped his foot on the ground." How does the boy feel?', '["Happy", "Frustrated or angry", "Sleepy", "Confused"]', 'Frustrated or angry', 'character_feelings', 'Inferring character emotions from actions'),
  (eid, 6, 'What is a summary?', '["Copying the whole story", "A short retelling of the most important parts", "The first sentence of a story", "Your opinion about a story"]', 'A short retelling of the most important parts', 'summarizing', 'Understanding what a summary is'),
  (eid, 7, 'Read: "Long ago, people used horses for transportation. Today, most people drive cars." What text structure is this?', '["Problem and solution", "Compare and contrast", "Cause and effect", "Sequence"]', 'Compare and contrast', 'text_structure', 'Identifying text structure patterns'),
  (eid, 8, 'Which of these is a simile?', '["The sun is hot.", "She ran to the store.", "He is as brave as a lion.", "The dog barked loudly."]', 'He is as brave as a lion.', 'figurative_language', 'Identifying similes'),
  (eid, 9, 'Read: "Scientists discovered that dolphins communicate using clicks and whistles. Each dolphin may have its own unique whistle." What can you infer?', '["Dolphins cannot hear", "Dolphins use whistles like names", "Dolphins are silent", "Scientists do not study dolphins"]', 'Dolphins use whistles like names', 'making_inferences', 'Drawing inferences from nonfiction text'),
  (eid, 10, 'What is the author''s purpose if they write a text to teach you about volcanoes?', '["To entertain", "To persuade", "To inform", "To confuse"]', 'To inform', 'authors_purpose', 'Identifying author''s purpose');
END $$;
-- ============================================================
-- 5TH GRADE MATH
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Math Assessment: 5th Grade', 'math', '5th', 'Diagnostic assessment for 5th grade math skills')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What is 3/4 + 1/2?', '["4/6", "1 1/4", "5/4", "1"]', '5/4', 'adding_fractions_unlike', 'Adding fractions with unlike denominators'),
  (eid, 2, 'What is 4.56 x 10?', '["0.456", "4.560", "45.6", "456"]', '45.6', 'decimal_multiplication', 'Multiplying decimals by powers of 10'),
  (eid, 3, 'What is the volume of a box that is 4 cm long, 3 cm wide, and 2 cm tall?', '["9 cubic cm", "18 cubic cm", "24 cubic cm", "36 cubic cm"]', '24 cubic cm', 'volume', 'Calculating volume of rectangular prisms'),
  (eid, 4, 'Which decimal is equal to 3/5?', '["0.35", "0.5", "0.6", "0.53"]', '0.6', 'fraction_to_decimal', 'Converting fractions to decimals'),
  (eid, 5, 'What is 2/3 x 6?', '["2", "3", "4", "12"]', '4', 'multiplying_fractions', 'Multiplying fractions by whole numbers'),
  (eid, 6, 'Order from least to greatest: 0.45, 0.5, 0.405', '["0.5, 0.45, 0.405", "0.405, 0.45, 0.5", "0.45, 0.405, 0.5", "0.405, 0.5, 0.45"]', '0.405, 0.45, 0.5', 'ordering_decimals', 'Ordering decimals from least to greatest'),
  (eid, 7, 'What is 15.8 - 7.35?', '["7.45", "8.45", "8.55", "9.45"]', '8.45', 'decimal_subtraction', 'Subtracting decimals'),
  (eid, 8, 'A recipe calls for 2/3 cup of sugar. If you want to make half the recipe, how much sugar do you need?', '["1/6 cup", "1/3 cup", "2/6 cup", "1/2 cup"]', '1/3 cup', 'fraction_word_problems', 'Solving word problems with fractions'),
  (eid, 9, 'What is the value of the expression: 3 + 4 x 2?', '["14", "11", "10", "9"]', '11', 'order_of_operations', 'Applying order of operations'),
  (eid, 10, 'Plot the point (3, 5) on a coordinate grid. Which direction do you move first?', '["Up 3", "Right 3", "Up 5", "Left 3"]', 'Right 3', 'coordinate_plane', 'Understanding coordinate pairs'),
  (eid, 11, 'Write 7/4 as a mixed number.', '["1 1/4", "1 3/4", "2 1/4", "1 2/4"]', '1 3/4', 'mixed_numbers', 'Converting improper fractions to mixed numbers'),
  (eid, 12, 'What is 456 / 12?', '["36", "37", "38", "39"]', '38', 'long_division', 'Dividing multi-digit numbers');
END $$;
-- ============================================================
-- 5TH GRADE READING
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Reading Assessment: 5th Grade', 'reading', '5th', 'Diagnostic assessment for 5th grade reading skills')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'Read: "The ancient Egyptians built the pyramids as tombs for their pharaohs. These massive structures took thousands of workers and many years to complete." What was the purpose of the pyramids?', '["Schools", "Markets", "Tombs for pharaohs", "Temples for worship"]', 'Tombs for pharaohs', 'reading_for_information', 'Extracting key information from nonfiction'),
  (eid, 2, 'What does the word "reluctant" mean? "She was reluctant to jump into the cold pool."', '["Excited", "Unwilling or hesitant", "Quick", "Happy"]', 'Unwilling or hesitant', 'vocabulary_grade5', 'Using context to determine word meaning'),
  (eid, 3, 'Read: "Thomas Edison failed thousands of times before inventing the light bulb. He said each failure taught him something new." What is the theme?', '["Failure means you should quit", "Persistence leads to success", "Science is easy", "Light bulbs are important"]', 'Persistence leads to success', 'theme_identification', 'Identifying themes in a text'),
  (eid, 4, 'What is the difference between a biography and an autobiography?', '["A biography is shorter", "An autobiography is written by someone else", "A biography is written about someone by another person", "There is no difference"]', 'A biography is written about someone by another person', 'genre_identification', 'Distinguishing between literary genres'),
  (eid, 5, 'Read: "The coral reef is home to thousands of species. Pollution and rising temperatures threaten these ecosystems." What is the author''s tone?', '["Humorous", "Concerned", "Excited", "Bored"]', 'Concerned', 'authors_tone', 'Identifying author''s tone'),
  (eid, 6, 'Which sentence contains a metaphor?', '["The stars twinkled brightly.", "Her smile was sunshine on a cloudy day.", "The dog ran as fast as the wind.", "It was a warm afternoon."]', 'Her smile was sunshine on a cloudy day.', 'figurative_language', 'Identifying metaphors'),
  (eid, 7, 'Read: "First, the caterpillar hatches from an egg. Then it eats and grows. Next, it forms a chrysalis. Finally, it becomes a butterfly." This text uses what structure?', '["Compare and contrast", "Problem and solution", "Chronological order", "Description"]', 'Chronological order', 'text_structure', 'Identifying chronological text structure'),
  (eid, 8, 'If a character in a story says one thing but does another, what literary device is being used?', '["Simile", "Irony", "Alliteration", "Onomatopoeia"]', 'Irony', 'literary_devices', 'Understanding irony'),
  (eid, 9, 'What does it mean to make a prediction while reading?', '["Summarize what happened", "Guess what might happen next based on clues", "Find the main idea", "Look up vocabulary words"]', 'Guess what might happen next based on clues', 'reading_strategies', 'Understanding prediction as a reading strategy'),
  (eid, 10, 'Read: "Recycling one ton of paper saves 17 trees." What is the author trying to persuade you to do?', '["Cut down trees", "Stop reading", "Recycle paper", "Plant flowers"]', 'Recycle paper', 'persuasive_text', 'Recognizing persuasive writing');
END $$;
-- ============================================================
-- 7TH GRADE MATH
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Math Assessment: 7th Grade', 'math', '7th', 'Diagnostic assessment for 7th grade math skills')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What is -5 + 8?', '["13", "3", "-3", "-13"]', '3', 'integer_addition', 'Adding integers with different signs'),
  (eid, 2, 'Solve: 2x + 5 = 15', '["x = 4", "x = 5", "x = 10", "x = 7"]', 'x = 5', 'two_step_equations', 'Solving two-step equations'),
  (eid, 3, 'What is 30% of 80?', '["20", "24", "30", "40"]', '24', 'percent_of_number', 'Finding a percent of a number'),
  (eid, 4, 'A shirt costs $25. It is on sale for 20% off. What is the sale price?', '["$5", "$15", "$20", "$22"]', '$20', 'percent_discount', 'Calculating percent discounts'),
  (eid, 5, 'What is the constant of proportionality in y = 4x?', '["x", "y", "4", "1"]', '4', 'proportional_relationships', 'Identifying constants of proportionality'),
  (eid, 6, 'What is -3 x -4?', '["-12", "-7", "7", "12"]', '12', 'integer_multiplication', 'Multiplying negative integers'),
  (eid, 7, 'A triangle has angles of 60 and 80 degrees. What is the third angle?', '["20", "30", "40", "60"]', '40', 'triangle_angle_sum', 'Using triangle angle sum property'),
  (eid, 8, 'What is the probability of rolling an even number on a six-sided die?', '["1/6", "1/3", "1/2", "2/3"]', '1/2', 'basic_probability', 'Calculating simple probability'),
  (eid, 9, 'Simplify: 3(2x + 4)', '["6x + 4", "5x + 7", "6x + 12", "6x + 7"]', '6x + 12', 'distributive_property', 'Applying the distributive property'),
  (eid, 10, 'The scale on a map is 1 inch = 50 miles. Two cities are 3.5 inches apart on the map. What is the actual distance?', '["150 miles", "175 miles", "200 miles", "350 miles"]', '175 miles', 'scale_drawings', 'Using scale factors'),
  (eid, 11, 'Which inequality represents "a number is at least 7"?', '["x > 7", "x < 7", "x >= 7", "x <= 7"]', 'x >= 7', 'inequalities', 'Writing and interpreting inequalities'),
  (eid, 12, 'What is the area of a circle with radius 5? (Use pi = 3.14)', '["15.7", "31.4", "78.5", "157"]', '78.5', 'area_of_circle', 'Calculating the area of a circle');
END $$;
-- ============================================================
-- 7TH GRADE READING
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Reading Assessment: 7th Grade', 'reading', '7th', 'Diagnostic assessment for 7th grade reading skills')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What does it mean to analyze a character?', '["Describe what they look like", "Examine their traits, motivations, and changes", "List every word they say", "Count how many times they appear"]', 'Examine their traits, motivations, and changes', 'character_analysis', 'Analyzing character development'),
  (eid, 2, 'Read: "The old house groaned in the wind, its broken windows staring like hollow eyes." This is an example of what?', '["Simile", "Personification", "Hyperbole", "Alliteration"]', 'Personification', 'figurative_language', 'Identifying personification'),
  (eid, 3, 'What does "credible" mean? "The scientist presented credible evidence for her theory."', '["Unbelievable", "Believable and trustworthy", "Confusing", "Expensive"]', 'Believable and trustworthy', 'academic_vocabulary', 'Understanding academic vocabulary'),
  (eid, 4, 'What is the purpose of a thesis statement in an essay?', '["To list vocabulary words", "To state the main argument or claim", "To tell a joke", "To describe the setting"]', 'To state the main argument or claim', 'essay_structure', 'Understanding essay components'),
  (eid, 5, 'Read: "Some people believe school should start later because teens need more sleep. Others argue early starts teach discipline." What structure is this?', '["Narrative", "Compare and contrast", "Chronological", "Descriptive"]', 'Compare and contrast', 'argument_structure', 'Recognizing argumentative text structures'),
  (eid, 6, 'Which is the best example of a primary source about the Civil War?', '["A textbook chapter", "A soldier''s diary from 1863", "A movie about the war", "A Wikipedia article"]', 'A soldier''s diary from 1863', 'primary_sources', 'Identifying primary vs. secondary sources'),
  (eid, 7, 'What does "connotation" mean?', '["The dictionary definition of a word", "The feelings or associations a word suggests", "A type of punctuation", "The opposite of a word"]', 'The feelings or associations a word suggests', 'connotation_denotation', 'Understanding connotation vs. denotation'),
  (eid, 8, 'Read: "Despite the team''s best efforts, they lost the championship. But they learned the value of teamwork." What is the theme?', '["Winning is everything", "Teamwork and growth matter more than winning", "Sports are unfair", "Practice is a waste of time"]', 'Teamwork and growth matter more than winning', 'theme_complex', 'Identifying complex themes'),
  (eid, 9, 'What is the purpose of textual evidence in an essay?', '["To make the essay longer", "To support claims with proof from the text", "To copy the entire passage", "To avoid writing your own ideas"]', 'To support claims with proof from the text', 'textual_evidence', 'Using textual evidence to support claims'),
  (eid, 10, 'When an author uses foreshadowing, they are:', '["Summarizing the story", "Giving hints about what will happen later", "Describing the setting in detail", "Explaining the theme directly"]', 'Giving hints about what will happen later', 'foreshadowing', 'Understanding foreshadowing');
END $$;
-- ============================================================
-- 8TH GRADE MATH
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Math Assessment: 8th Grade', 'math', '8th', 'Diagnostic assessment for 8th grade math skills')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What is the slope of the line y = 3x + 7?', '["7", "3", "3x", "x"]', '3', 'slope_from_equation', 'Identifying slope from slope-intercept form'),
  (eid, 2, 'Simplify: 2^3 x 2^4', '["2^7", "2^12", "4^7", "2^1"]', '2^7', 'exponent_rules', 'Applying exponent multiplication rules'),
  (eid, 3, 'Solve: 3x - 7 = 2x + 5', '["x = 2", "x = 12", "x = -2", "x = -12"]', 'x = 12', 'equations_variables_both_sides', 'Solving equations with variables on both sides'),
  (eid, 4, 'What is the square root of 144?', '["11", "12", "13", "14"]', '12', 'square_roots', 'Finding square roots of perfect squares'),
  (eid, 5, 'A line passes through (0, 2) and (3, 8). What is its slope?', '["2", "3", "6", "2/3"]', '2', 'slope_from_points', 'Calculating slope from two points'),
  (eid, 6, 'Which number is irrational?', '["1/3", "0.75", "Square root of 2", "4"]', 'Square root of 2', 'rational_irrational', 'Distinguishing rational from irrational numbers'),
  (eid, 7, 'What transformation moves a shape without rotating or flipping it?', '["Rotation", "Reflection", "Translation", "Dilation"]', 'Translation', 'transformations', 'Identifying geometric transformations'),
  (eid, 8, 'Solve the system: y = 2x + 1 and y = x + 4', '["(3, 7)", "(1, 5)", "(4, 8)", "(2, 6)"]', '(3, 7)', 'systems_of_equations', 'Solving systems of linear equations'),
  (eid, 9, 'What is the Pythagorean theorem?', '["a + b = c", "a^2 + b^2 = c^2", "2a + 2b = c", "a x b = c"]', 'a^2 + b^2 = c^2', 'pythagorean_theorem', 'Understanding the Pythagorean theorem'),
  (eid, 10, 'A right triangle has legs of 3 and 4. What is the hypotenuse?', '["5", "6", "7", "12"]', '5', 'pythagorean_application', 'Applying the Pythagorean theorem'),
  (eid, 11, 'What does the expression 5 x 10^3 equal?', '["500", "5,000", "50,000", "15"]', '5,000', 'scientific_notation', 'Understanding scientific notation'),
  (eid, 12, 'Which graph represents a function?', '["A circle", "A vertical line", "A horizontal line", "A zigzag that crosses itself vertically"]', 'A horizontal line', 'functions', 'Identifying functions using vertical line test');
END $$;
-- ============================================================
-- 8TH GRADE READING
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Reading Assessment: 8th Grade', 'reading', '8th', 'Diagnostic assessment for 8th grade reading skills')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What is the difference between a static and dynamic character?', '["Static characters talk more", "Dynamic characters change throughout the story", "Static characters are always villains", "There is no difference"]', 'Dynamic characters change throughout the story', 'character_types', 'Understanding static vs. dynamic characters'),
  (eid, 2, 'What does "ambiguous" mean? "The ending of the story was ambiguous."', '["Clear and obvious", "Open to more than one interpretation", "Very long", "Boring"]', 'Open to more than one interpretation', 'advanced_vocabulary', 'Understanding advanced vocabulary'),
  (eid, 3, 'Read: "All my friends have the newest phone, so you should buy me one too." What type of logical fallacy is this?', '["Straw man", "Bandwagon", "Ad hominem", "Red herring"]', 'Bandwagon', 'logical_fallacies', 'Identifying logical fallacies'),
  (eid, 4, 'What is an unreliable narrator?', '["A narrator who speaks slowly", "A narrator whose account may not be trustworthy", "A narrator who reads from a script", "A narrator who is very young"]', 'A narrator whose account may not be trustworthy', 'unreliable_narrator', 'Understanding unreliable narrators'),
  (eid, 5, 'What is the purpose of a counterclaim in an argumentative essay?', '["To agree with the opposition", "To acknowledge and refute the opposing viewpoint", "To change the topic", "To end the essay"]', 'To acknowledge and refute the opposing viewpoint', 'argumentative_writing', 'Understanding argumentative essay structure'),
  (eid, 6, 'Read: "The pen is mightier than the sword." This is an example of:', '["Literal language", "A metaphor about writing being more powerful than violence", "A fact about pens", "An oxymoron"]', 'A metaphor about writing being more powerful than violence', 'metaphor_analysis', 'Analyzing extended metaphors'),
  (eid, 7, 'What is a motif in literature?', '["The setting of a story", "A recurring symbol or idea throughout a work", "The main character", "The climax"]', 'A recurring symbol or idea throughout a work', 'literary_motif', 'Understanding motifs in literature'),
  (eid, 8, 'When comparing two texts on the same topic, what should you look for?', '["Which one is longer", "Similarities and differences in their arguments and evidence", "Which one has more pictures", "Which author is older"]', 'Similarities and differences in their arguments and evidence', 'comparing_texts', 'Comparing and contrasting multiple texts'),
  (eid, 9, 'What is the purpose of citing sources in research writing?', '["To make the paper longer", "To give credit and allow readers to verify information", "To show you can copy", "To impress the teacher"]', 'To give credit and allow readers to verify information', 'citing_sources', 'Understanding the purpose of citations'),
  (eid, 10, 'What is dramatic irony?', '["When the dialogue is funny", "When the audience knows something the characters do not", "When the story has a happy ending", "When the author uses big words"]', 'When the audience knows something the characters do not', 'dramatic_irony', 'Understanding dramatic irony');
END $$;
-- ============================================================
-- 9TH GRADE MATH
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Math Assessment: 9th Grade', 'math', '9th', 'Diagnostic assessment for 9th grade math skills (Algebra I)')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'Solve: 2(x - 3) = 10', '["x = 2", "x = 5", "x = 8", "x = 6.5"]', 'x = 8', 'multi_step_equations', 'Solving multi-step linear equations'),
  (eid, 2, 'Factor: x^2 + 5x + 6', '["(x+1)(x+6)", "(x+2)(x+3)", "(x+1)(x+5)", "(x+3)(x+3)"]', '(x+2)(x+3)', 'factoring_quadratics', 'Factoring quadratic trinomials'),
  (eid, 3, 'What is the y-intercept of y = -2x + 5?', '["2", "-2", "5", "-5"]', '5', 'y_intercept', 'Identifying the y-intercept'),
  (eid, 4, 'Simplify: (3x^2)(4x^3)', '["7x^5", "12x^5", "12x^6", "7x^6"]', '12x^5', 'polynomial_multiplication', 'Multiplying monomials'),
  (eid, 5, 'Solve: x^2 = 49', '["x = 7", "x = -7", "x = 7 or x = -7", "x = 24.5"]', 'x = 7 or x = -7', 'solving_quadratics', 'Solving simple quadratic equations'),
  (eid, 6, 'What is the domain of f(x) = 1/(x-3)?', '["All real numbers", "All numbers except 3", "Only positive numbers", "Only x = 3"]', 'All numbers except 3', 'domain_of_functions', 'Finding the domain of a function'),
  (eid, 7, 'Graph the inequality: y > 2x - 1. Which area is shaded?', '["Below the line", "Above the line", "On the line only", "No shading"]', 'Above the line', 'graphing_inequalities', 'Graphing linear inequalities'),
  (eid, 8, 'What is the slope of a line perpendicular to y = 3x + 1?', '["3", "-3", "1/3", "-1/3"]', '-1/3', 'perpendicular_slopes', 'Finding slopes of perpendicular lines'),
  (eid, 9, 'Simplify: sqrt(50)', '["5sqrt(2)", "25", "10sqrt(5)", "2sqrt(25)"]', '5sqrt(2)', 'simplifying_radicals', 'Simplifying square root expressions'),
  (eid, 10, 'A car rental costs $30 per day plus $0.15 per mile. Write an expression for the total cost of renting for d days and driving m miles.', '["30d + 0.15m", "30m + 0.15d", "30 + 0.15", "30d x 0.15m"]', '30d + 0.15m', 'writing_expressions', 'Writing algebraic expressions from real-world scenarios'),
  (eid, 11, 'What is the equation of a line with slope 2 passing through (1, 5)?', '["y = 2x + 3", "y = 2x + 5", "y = 5x + 2", "y = 2x + 1"]', 'y = 2x + 3', 'point_slope_form', 'Writing equations using point-slope form'),
  (eid, 12, 'Solve the system: x + y = 10 and x - y = 2', '["(6, 4)", "(4, 6)", "(5, 5)", "(8, 2)"]', '(6, 4)', 'systems_elimination', 'Solving systems by elimination');
END $$;
-- ============================================================
-- 9TH GRADE READING
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Reading Assessment: 9th Grade', 'reading', '9th', 'Diagnostic assessment for 9th grade reading and language arts')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What is the difference between denotation and connotation?', '["They mean the same thing", "Denotation is literal meaning, connotation is implied meaning", "Connotation is in the dictionary", "Denotation is about feelings"]', 'Denotation is literal meaning, connotation is implied meaning', 'denotation_connotation', 'Distinguishing denotation from connotation'),
  (eid, 2, 'In "Romeo and Juliet," the families'' feud is an example of what type of conflict?', '["Person vs. nature", "Person vs. self", "Person vs. society", "Person vs. person"]', 'Person vs. person', 'types_of_conflict', 'Identifying types of conflict in literature'),
  (eid, 3, 'What does "juxtaposition" mean in literature?', '["A type of rhyme scheme", "Placing two things side by side for comparison or contrast", "A character''s inner thoughts", "The climax of a story"]', 'Placing two things side by side for comparison or contrast', 'literary_terms', 'Understanding literary terminology'),
  (eid, 4, 'What makes a source credible?', '["It is long", "It has a catchy title", "It comes from a reliable author with evidence and expertise", "It was posted recently"]', 'It comes from a reliable author with evidence and expertise', 'source_evaluation', 'Evaluating source credibility'),
  (eid, 5, 'What is the purpose of a rhetorical question?', '["To get an answer", "To make the audience think, not to get an actual answer", "To end an essay", "To introduce a character"]', 'To make the audience think, not to get an actual answer', 'rhetorical_devices', 'Understanding rhetorical devices'),
  (eid, 6, 'What is an allegory?', '["A short poem", "A story with a hidden meaning, often moral or political", "A type of essay", "A dialogue between characters"]', 'A story with a hidden meaning, often moral or political', 'allegory', 'Understanding allegory'),
  (eid, 7, 'Read: "She devoured the book in one sitting." What does "devoured" mean here?', '["Ate the book", "Read it very quickly and eagerly", "Destroyed the book", "Bought the book"]', 'Read it very quickly and eagerly', 'figurative_meaning', 'Interpreting figurative language in context'),
  (eid, 8, 'What is the difference between mood and tone?', '["They are the same", "Mood is the reader''s feeling, tone is the author''s attitude", "Tone is the reader''s feeling, mood is the setting", "Mood only applies to poetry"]', 'Mood is the reader''s feeling, tone is the author''s attitude', 'mood_vs_tone', 'Distinguishing mood from tone'),
  (eid, 9, 'In a persuasive essay, what is ethos?', '["Emotional appeal", "Logical reasoning", "Establishing the author''s credibility", "A call to action"]', 'Establishing the author''s credibility', 'ethos_pathos_logos', 'Understanding persuasive appeals'),
  (eid, 10, 'What is a foil character?', '["The main character", "A character who contrasts with another to highlight qualities", "A villain", "A narrator"]', 'A character who contrasts with another to highlight qualities', 'foil_character', 'Understanding foil characters');
END $$;
-- ============================================================
-- 10TH GRADE MATH
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Math Assessment: 10th Grade', 'math', '10th', 'Diagnostic assessment for 10th grade math skills (Geometry)')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'Two angles are supplementary. One measures 65 degrees. What is the other?', '["25", "65", "115", "125"]', '115', 'supplementary_angles', 'Finding supplementary angles'),
  (eid, 2, 'What is the area of a triangle with base 10 and height 6?', '["16", "30", "60", "15"]', '30', 'triangle_area', 'Calculating area of triangles'),
  (eid, 3, 'If two triangles are similar, what must be true?', '["They are the same size", "Their corresponding angles are equal", "They have equal perimeters", "They are both right triangles"]', 'Their corresponding angles are equal', 'similar_triangles', 'Understanding triangle similarity'),
  (eid, 4, 'What is the distance between points (1, 2) and (4, 6)?', '["3", "4", "5", "7"]', '5', 'distance_formula', 'Using the distance formula'),
  (eid, 5, 'A circle has a diameter of 14. What is its circumference? (Use pi = 3.14)', '["21.98", "43.96", "49.00", "87.92"]', '43.96', 'circle_circumference', 'Calculating circumference from diameter'),
  (eid, 6, 'What is the volume of a cylinder with radius 3 and height 10? (Use pi = 3.14)', '["94.2", "188.4", "282.6", "28.26"]', '282.6', 'cylinder_volume', 'Calculating volume of cylinders'),
  (eid, 7, 'In a right triangle, sin(A) = opposite/hypotenuse. If the opposite side is 3 and hypotenuse is 5, what is sin(A)?', '["3/5", "5/3", "4/5", "3/4"]', '3/5', 'basic_trigonometry', 'Understanding basic trigonometric ratios'),
  (eid, 8, 'What is the midpoint of (2, 8) and (6, 4)?', '["(4, 6)", "(8, 12)", "(3, 5)", "(4, 4)"]', '(4, 6)', 'midpoint_formula', 'Using the midpoint formula'),
  (eid, 9, 'Lines that never intersect and are always the same distance apart are called:', '["Perpendicular", "Parallel", "Intersecting", "Skew"]', 'Parallel', 'parallel_lines', 'Understanding parallel lines'),
  (eid, 10, 'What type of polygon has 6 sides?', '["Pentagon", "Hexagon", "Heptagon", "Octagon"]', 'Hexagon', 'polygon_names', 'Naming polygons by number of sides'),
  (eid, 11, 'If a shape is dilated by a scale factor of 2, what happens to its area?', '["Doubles", "Triples", "Quadruples", "Stays the same"]', 'Quadruples', 'dilation_area', 'Understanding how dilation affects area'),
  (eid, 12, 'Two parallel lines are cut by a transversal. Alternate interior angles are:', '["Supplementary", "Complementary", "Equal", "Perpendicular"]', 'Equal', 'transversal_angles', 'Understanding angle relationships with parallel lines');
END $$;
-- ============================================================
-- 10TH GRADE READING
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Reading Assessment: 10th Grade', 'reading', '10th', 'Diagnostic assessment for 10th grade reading and language arts')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What is the difference between a Shakespearean and Petrarchan sonnet?', '["The number of lines", "The rhyme scheme and structure", "The language used", "One is longer"]', 'The rhyme scheme and structure', 'poetry_forms', 'Understanding different sonnet forms'),
  (eid, 2, 'What is an oxymoron?', '["A figure of speech combining contradictory terms", "A comparison using like or as", "An exaggerated statement", "A sound word"]', 'A figure of speech combining contradictory terms', 'oxymoron', 'Identifying oxymorons'),
  (eid, 3, 'What makes a tragic hero in classical literature?', '["A hero who never makes mistakes", "A noble character with a fatal flaw that leads to downfall", "A villain who becomes good", "Any character who dies"]', 'A noble character with a fatal flaw that leads to downfall', 'tragic_hero', 'Understanding the tragic hero archetype'),
  (eid, 4, 'What is the difference between satire and parody?', '["They are the same", "Satire criticizes through humor, parody imitates for comic effect", "Parody is serious, satire is funny", "Satire is only in poetry"]', 'Satire criticizes through humor, parody imitates for comic effect', 'satire_parody', 'Distinguishing satire from parody'),
  (eid, 5, 'What is an archetype?', '["A spelling error", "A universal symbol or pattern found across cultures and literature", "A type of poem", "The first draft of a story"]', 'A universal symbol or pattern found across cultures and literature', 'archetypes', 'Understanding literary archetypes'),
  (eid, 6, 'In an argument, what is a concession?', '["A snack at a theater", "Acknowledging a valid point made by the opposition", "Giving up on your argument", "The conclusion"]', 'Acknowledging a valid point made by the opposition', 'argument_concession', 'Understanding concession in argumentation'),
  (eid, 7, 'What is stream of consciousness?', '["A type of river", "A narrative technique that presents a character''s continuous flow of thoughts", "A poetry structure", "A plot device"]', 'A narrative technique that presents a character''s continuous flow of thoughts', 'narrative_techniques', 'Understanding stream of consciousness'),
  (eid, 8, 'What does "synthesize" mean when analyzing multiple texts?', '["Summarize each one", "Combine ideas from multiple sources to form a new understanding", "Copy the best parts", "Read them all at once"]', 'Combine ideas from multiple sources to form a new understanding', 'synthesis', 'Synthesizing information from multiple texts'),
  (eid, 9, 'What is the significance of an epigraph at the beginning of a chapter or book?', '["It is a required format", "It sets the tone or hints at themes", "It summarizes the chapter", "It is the author''s biography"]', 'It sets the tone or hints at themes', 'epigraph', 'Understanding the role of epigraphs'),
  (eid, 10, 'What is logos in rhetoric?', '["An emotional appeal", "A logical appeal using evidence and reasoning", "An ethical appeal", "A type of logo design"]', 'A logical appeal using evidence and reasoning', 'rhetorical_logos', 'Understanding logos in rhetoric');
END $$;
-- ============================================================
-- 11TH GRADE MATH
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Math Assessment: 11th Grade', 'math', '11th', 'Diagnostic assessment for 11th grade math skills (Algebra II)')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'Solve: x^2 - 5x + 6 = 0', '["x = 1, x = 6", "x = 2, x = 3", "x = -2, x = -3", "x = 5, x = 1"]', 'x = 2, x = 3', 'quadratic_equations', 'Solving quadratic equations by factoring'),
  (eid, 2, 'What is log base 10 of 1000?', '["2", "3", "10", "100"]', '3', 'logarithms', 'Evaluating logarithmic expressions'),
  (eid, 3, 'Simplify: (x^2 - 9)/(x - 3)', '["x - 3", "x + 3", "x^2 - 3", "x - 9"]', 'x + 3', 'rational_expressions', 'Simplifying rational expressions'),
  (eid, 4, 'What is i^2?', '["1", "-1", "i", "-i"]', '-1', 'imaginary_numbers', 'Understanding imaginary numbers'),
  (eid, 5, 'If f(x) = 2x + 1 and g(x) = x^2, what is f(g(3))?', '["7", "19", "37", "13"]', '19', 'function_composition', 'Evaluating composite functions'),
  (eid, 6, 'What is the vertex of y = (x - 2)^2 + 5?', '["(2, 5)", "(-2, 5)", "(2, -5)", "(5, 2)"]', '(2, 5)', 'vertex_form', 'Identifying vertex from vertex form'),
  (eid, 7, 'Solve: 2^x = 16', '["x = 2", "x = 3", "x = 4", "x = 8"]', 'x = 4', 'exponential_equations', 'Solving exponential equations'),
  (eid, 8, 'What is the end behavior of f(x) = -x^3 + 2x?', '["Both ends go up", "Both ends go down", "Left up, right down", "Left down, right up"]', 'Left up, right down', 'polynomial_end_behavior', 'Analyzing end behavior of polynomials'),
  (eid, 9, 'Find the sum of the arithmetic series: 2 + 5 + 8 + 11 + 14', '["35", "40", "45", "30"]', '40', 'arithmetic_series', 'Summing arithmetic series'),
  (eid, 10, 'What is the inverse of f(x) = 3x - 6?', '["f^-1(x) = (x+6)/3", "f^-1(x) = 3x + 6", "f^-1(x) = x/3 - 6", "f^-1(x) = (x-6)/3"]', 'f^-1(x) = (x+6)/3', 'inverse_functions', 'Finding inverse functions'),
  (eid, 11, 'How many solutions does a quadratic equation have if the discriminant is negative?', '["0 real solutions", "1 real solution", "2 real solutions", "Infinite solutions"]', '0 real solutions', 'discriminant', 'Using the discriminant'),
  (eid, 12, 'What is the period of y = sin(2x)?', '["pi", "2pi", "pi/2", "4pi"]', 'pi', 'trig_period', 'Finding the period of trigonometric functions');
END $$;
-- ============================================================
-- 11TH GRADE READING
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Reading Assessment: 11th Grade', 'reading', '11th', 'Diagnostic assessment for 11th grade reading and language arts')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What is a bildungsroman?', '["A type of poem", "A coming-of-age novel", "A mystery genre", "A historical document"]', 'A coming-of-age novel', 'literary_genres', 'Understanding the bildungsroman genre'),
  (eid, 2, 'What is the purpose of an author using an extended metaphor throughout an entire work?', '["To confuse the reader", "To develop a complex comparison that deepens meaning", "To make the text longer", "To avoid literal descriptions"]', 'To develop a complex comparison that deepens meaning', 'extended_metaphor', 'Analyzing extended metaphors'),
  (eid, 3, 'What does it mean to "read between the lines"?', '["Read very slowly", "Understand implied meaning that is not directly stated", "Skip every other line", "Read aloud"]', 'Understand implied meaning that is not directly stated', 'implicit_meaning', 'Understanding implicit meaning'),
  (eid, 4, 'What is the role of historical context in interpreting literature?', '["It is irrelevant", "It helps explain why the author wrote certain things and how audiences received it", "It only matters for nonfiction", "It tells you the plot"]', 'It helps explain why the author wrote certain things and how audiences received it', 'historical_context', 'Using historical context for interpretation'),
  (eid, 5, 'What is a red herring in literature?', '["A type of fish in a story", "A misleading clue that distracts from the real issue", "The main theme", "A character''s nickname"]', 'A misleading clue that distracts from the real issue', 'red_herring', 'Identifying red herrings'),
  (eid, 6, 'In academic writing, what does "nuanced" mean?', '["Simple and direct", "Having subtle differences or complexities", "Very long", "Written in formal language"]', 'Having subtle differences or complexities', 'academic_vocabulary_11', 'Understanding nuanced academic vocabulary'),
  (eid, 7, 'What is the difference between a claim and a thesis?', '["They are identical", "A thesis is the central argument of an entire essay; a claim is a single arguable point", "A claim is always true; a thesis is opinion", "A thesis is shorter than a claim"]', 'A thesis is the central argument of an entire essay; a claim is a single arguable point', 'thesis_vs_claim', 'Distinguishing thesis from claim'),
  (eid, 8, 'What is epistolary fiction?', '["Fiction set in space", "Fiction told through letters, diary entries, or documents", "Fiction written in verse", "Fiction about historical events"]', 'Fiction told through letters, diary entries, or documents', 'epistolary', 'Understanding epistolary fiction'),
  (eid, 9, 'What is the function of a volta in a sonnet?', '["To end the poem", "To introduce a turn or shift in thought", "To create a rhyme", "To define the setting"]', 'To introduce a turn or shift in thought', 'poetic_terms', 'Understanding the volta in sonnets'),
  (eid, 10, 'What distinguishes modernist literature from earlier movements?', '["It is always humorous", "It experiments with form and often reflects disillusionment", "It follows strict traditional rules", "It is only written in English"]', 'It experiments with form and often reflects disillusionment', 'literary_movements', 'Understanding literary movements');
END $$;
-- ============================================================
-- 12TH GRADE MATH
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Math Assessment: 12th Grade', 'math', '12th', 'Diagnostic assessment for 12th grade math skills (Pre-Calculus/Calculus)')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What is the limit of (x^2 - 4)/(x - 2) as x approaches 2?', '["0", "2", "4", "Does not exist"]', '4', 'limits', 'Evaluating limits algebraically'),
  (eid, 2, 'What is the derivative of f(x) = 3x^2?', '["3x", "6x", "6x^2", "x^2"]', '6x', 'basic_derivatives', 'Finding derivatives using power rule'),
  (eid, 3, 'What is sin(pi/6)?', '["0", "1/2", "sqrt(3)/2", "1"]', '1/2', 'unit_circle', 'Evaluating trig functions on the unit circle'),
  (eid, 4, 'What is the integral of 2x dx?', '["x^2", "x^2 + C", "2x^2 + C", "x + C"]', 'x^2 + C', 'basic_integration', 'Finding basic antiderivatives'),
  (eid, 5, 'What is the amplitude of y = 3sin(x)?', '["1", "3", "6", "pi"]', '3', 'trig_amplitude', 'Identifying amplitude of trig functions'),
  (eid, 6, 'If f(x) = e^x, what is f''(x)?', '["xe^(x-1)", "e^x", "e", "x*e^x"]', 'e^x', 'exponential_derivatives', 'Differentiating exponential functions'),
  (eid, 7, 'Convert 180 degrees to radians.', '["pi/2", "pi", "2pi", "pi/4"]', 'pi', 'radian_conversion', 'Converting between degrees and radians'),
  (eid, 8, 'What is the sum of the infinite geometric series: 4 + 2 + 1 + 1/2 + ...?', '["7", "8", "10", "Infinite"]', '8', 'infinite_series', 'Summing infinite geometric series'),
  (eid, 9, 'What does the first derivative tell you about a function?', '["The area under the curve", "The rate of change (slope) at any point", "The y-intercept", "The domain"]', 'The rate of change (slope) at any point', 'derivative_meaning', 'Understanding the meaning of derivatives'),
  (eid, 10, 'Factor completely: x^3 - 8', '["(x-2)(x^2+2x+4)", "(x-2)(x+4)", "(x-2)^3", "(x-8)(x+1)"]', '(x-2)(x^2+2x+4)', 'factoring_cubes', 'Factoring difference of cubes'),
  (eid, 11, 'What is the range of f(x) = x^2?', '["All real numbers", "y >= 0", "y > 0", "y <= 0"]', 'y >= 0', 'range_of_functions', 'Determining the range of functions'),
  (eid, 12, 'What type of discontinuity does f(x) = 1/x have at x = 0?', '["Removable", "Jump", "Infinite (vertical asymptote)", "None"]', 'Infinite (vertical asymptote)', 'discontinuity_types', 'Identifying types of discontinuity');
END $$;
-- ============================================================
-- 12TH GRADE READING
-- ============================================================
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Reading Assessment: 12th Grade', 'reading', '12th', 'Diagnostic assessment for 12th grade reading and language arts')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What is deconstruction in literary criticism?', '["Breaking a book into chapters", "Analyzing how a text undermines its own assumptions and meanings", "Summarizing a text", "Correcting grammar errors"]', 'Analyzing how a text undermines its own assumptions and meanings', 'literary_criticism', 'Understanding deconstructionist criticism'),
  (eid, 2, 'What is the significance of an author''s choice of diction?', '["It does not matter", "Word choice shapes tone, mood, and meaning", "Diction only affects the length", "It only matters in poetry"]', 'Word choice shapes tone, mood, and meaning', 'diction_analysis', 'Analyzing the impact of diction'),
  (eid, 3, 'What is a palimpsest as a literary concept?', '["A type of paragraph", "A text with layers of meaning, where earlier meanings show through", "A list of characters", "A rhyme scheme"]', 'A text with layers of meaning, where earlier meanings show through', 'palimpsest', 'Understanding layered meaning in texts'),
  (eid, 4, 'What is the difference between postmodernism and modernism in literature?', '["They are the same", "Postmodernism often rejects grand narratives and embraces irony and fragmentation more than modernism", "Modernism came after postmodernism", "Postmodernism is always nonfiction"]', 'Postmodernism often rejects grand narratives and embraces irony and fragmentation more than modernism', 'literary_periods', 'Comparing literary periods'),
  (eid, 5, 'In rhetoric, what is kairos?', '["A type of evidence", "The opportune moment or context for making an argument", "The speaker''s credibility", "The emotional appeal"]', 'The opportune moment or context for making an argument', 'kairos', 'Understanding kairos in rhetoric'),
  (eid, 6, 'What does it mean to interrogate a text?', '["Read it aloud", "Question its assumptions, biases, and underlying messages", "Translate it into another language", "Memorize it"]', 'Question its assumptions, biases, and underlying messages', 'critical_reading', 'Understanding critical reading practices'),
  (eid, 7, 'What is intertextuality?', '["Reading between the lines", "The relationship between texts, where one text references or influences another", "A type of bibliography", "Internal conflict in a story"]', 'The relationship between texts, where one text references or influences another', 'intertextuality', 'Understanding intertextual references'),
  (eid, 8, 'What distinguishes a polemic from a standard argumentative essay?', '["A polemic is shorter", "A polemic is aggressively one-sided and confrontational", "A polemic has no thesis", "There is no difference"]', 'A polemic is aggressively one-sided and confrontational', 'polemic', 'Understanding polemic writing'),
  (eid, 9, 'What is the role of an interlocutor in a Socratic dialogue?', '["To narrate the story", "To ask questions that push the dialogue forward and challenge ideas", "To summarize at the end", "To provide comic relief"]', 'To ask questions that push the dialogue forward and challenge ideas', 'socratic_dialogue', 'Understanding Socratic dialogue structure'),
  (eid, 10, 'What is the difference between prescriptive and descriptive grammar?', '["They are identical", "Prescriptive sets rules for correct usage; descriptive documents how language is actually used", "Descriptive is for poetry only", "Prescriptive is outdated"]', 'Prescriptive sets rules for correct usage; descriptive documents how language is actually used', 'grammar_philosophy', 'Understanding approaches to grammar');
END $$;

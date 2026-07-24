-- Add missing 6th grade reading exam
DO $$
DECLARE eid UUID;
BEGIN
  INSERT INTO diagnostic_exams (title, subject, grade_level, description)
  VALUES ('Reading Assessment: 6th Grade', 'reading', '6th', 'Diagnostic assessment for 6th grade reading skills')
  ON CONFLICT (subject, grade_level) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO eid;

  DELETE FROM diagnostic_questions WHERE exam_id = eid;

  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What is the difference between first-person and third-person point of view?', '["First person is always fiction", "First person uses I/me, third person uses he/she/they", "Third person is always nonfiction", "There is no difference"]', 'First person uses I/me, third person uses he/she/they', 'point_of_view', 'Identifying narrative point of view'),
  (eid, 2, 'Read: "The river carved its way through the valley over thousands of years, creating a deep canyon." What does "carved" mean here?', '["Cut or shaped slowly", "Painted", "Filled up", "Froze"]', 'Cut or shaped slowly', 'vocabulary_in_context', 'Using context clues to determine word meaning'),
  (eid, 3, 'What is a theme in a story?', '["The topic of the story", "A life lesson or message the author wants to share", "The setting", "The main character"]', 'A life lesson or message the author wants to share', 'theme_identification', 'Understanding the difference between topic and theme'),
  (eid, 4, 'Read: "Solar panels convert sunlight into electricity. Many homes and businesses now use solar energy to reduce their electric bills." What is the author''s purpose?', '["To entertain", "To persuade you to buy solar panels", "To inform about how solar panels work", "To tell a story"]', 'To inform about how solar panels work', 'authors_purpose', 'Identifying author''s purpose in nonfiction'),
  (eid, 5, 'Which sentence contains an example of alliteration?', '["The cat sat on the mat.", "Peter Piper picked a peck of pickled peppers.", "She was as tall as a tree.", "The thunder roared loudly."]', 'Peter Piper picked a peck of pickled peppers.', 'figurative_language', 'Identifying alliteration'),
  (eid, 6, 'Read: "Marcus wanted to win the race more than anything. He trained every morning before school, even in the rain." What character trait best describes Marcus?', '["Lazy", "Determined", "Shy", "Selfish"]', 'Determined', 'character_traits', 'Inferring character traits from actions'),
  (eid, 7, 'What is the climax of a story?', '["The beginning", "The most exciting or turning point", "The resolution", "The setting description"]', 'The most exciting or turning point', 'plot_structure', 'Understanding plot structure elements'),
  (eid, 8, 'Read: "Unlike dogs, cats are independent animals. Dogs need constant attention, while cats prefer to be alone." What text structure is this?', '["Sequence", "Compare and contrast", "Problem and solution", "Cause and effect"]', 'Compare and contrast', 'text_structure', 'Identifying compare and contrast text structure'),
  (eid, 9, 'What does it mean to cite evidence from a text?', '["Copy the entire text", "Use specific quotes or details from the text to support your answer", "Guess the answer", "Only use your own opinion"]', 'Use specific quotes or details from the text to support your answer', 'citing_evidence', 'Understanding how to cite textual evidence'),
  (eid, 10, 'Read: "The old lighthouse stood alone on the cliff, battered by decades of storms, its light still shining across the dark water." What mood does this create?', '["Cheerful and exciting", "Lonely but resilient", "Angry and violent", "Silly and playful"]', 'Lonely but resilient', 'mood', 'Identifying mood in descriptive writing');
END $$;

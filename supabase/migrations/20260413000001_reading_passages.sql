-- Add passage column to diagnostic exams for reading comprehension
ALTER TABLE diagnostic_exams ADD COLUMN passage TEXT;
-- ============================================================
-- Replace all reading exam questions with passage-based format
-- Each grade gets ONE reading passage + 8 comprehension questions
-- ============================================================

-- 1ST GRADE READING
DO $$
DECLARE eid UUID;
BEGIN
  SELECT id INTO eid FROM diagnostic_exams WHERE subject = 'reading' AND grade_level = '1st';
  UPDATE diagnostic_exams SET passage = 'Max the dog loved to play in the park. Every morning, he would run to the door and bark. His owner, Lily, would put on his red leash and walk him down the street. At the park, Max liked to chase squirrels. He never caught one, but he always tried. After playing, Lily would give Max a treat. Max would wag his tail and lick her hand. Then they would walk home together.' WHERE id = eid;
  DELETE FROM diagnostic_questions WHERE exam_id = eid;
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What is the dog''s name?', '["Lily", "Max", "Red", "Buddy"]', 'Max', 'detail_recall', 'Recalling details from a passage'),
  (eid, 2, 'What color is Max''s leash?', '["Blue", "Green", "Red", "Yellow"]', 'Red', 'detail_recall', 'Identifying specific details'),
  (eid, 3, 'What does Max like to chase at the park?', '["Cats", "Birds", "Squirrels", "Balls"]', 'Squirrels', 'detail_recall', 'Finding information in text'),
  (eid, 4, 'What does Max do when he gets a treat?', '["He barks", "He runs away", "He wags his tail", "He sits down"]', 'He wags his tail', 'detail_recall', 'Recalling character actions'),
  (eid, 5, 'Who is Max''s owner?', '["Max", "Lily", "The squirrel", "Red"]', 'Lily', 'detail_recall', 'Identifying characters'),
  (eid, 6, 'When does Max go to the park?', '["At night", "Every morning", "On weekends", "After lunch"]', 'Every morning', 'detail_recall', 'Finding time details'),
  (eid, 7, 'Does Max ever catch a squirrel?', '["Yes", "No", "Sometimes", "The story does not say"]', 'No', 'reading_comprehension', 'Understanding what happened'),
  (eid, 8, 'How do you think Max feels about going to the park?', '["Sad", "Scared", "Happy and excited", "Tired"]', 'Happy and excited', 'making_inferences', 'Making inferences about feelings');
END $$;
-- 2ND GRADE READING
DO $$
DECLARE eid UUID;
BEGIN
  SELECT id INTO eid FROM diagnostic_exams WHERE subject = 'reading' AND grade_level = '2nd';
  UPDATE diagnostic_exams SET passage = 'Ana wanted to grow a sunflower. She dug a small hole in the garden and dropped in a seed. Every day, she watered it and made sure it got plenty of sunlight. For two weeks, nothing happened. Ana started to feel worried. Then one morning, she saw a tiny green sprout poking out of the dirt. She jumped up and down with joy. Over the next month, the sprout grew taller and taller. By summer, the sunflower was taller than Ana! It had bright yellow petals and a big brown center. Ana smiled every time she looked at it.' WHERE id = eid;
  DELETE FROM diagnostic_questions WHERE exam_id = eid;
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What did Ana want to grow?', '["A rose", "A sunflower", "A tree", "Vegetables"]', 'A sunflower', 'detail_recall', 'Recalling the main detail'),
  (eid, 2, 'What did Ana do every day to help the seed?', '["Sang to it", "Watered it", "Moved it inside", "Nothing"]', 'Watered it', 'detail_recall', 'Identifying actions'),
  (eid, 3, 'How long did Ana wait before seeing a sprout?', '["One day", "One week", "Two weeks", "One month"]', 'Two weeks', 'detail_recall', 'Finding time details'),
  (eid, 4, 'How did Ana feel when she saw the sprout?', '["Sad", "Angry", "Joyful", "Confused"]', 'Joyful', 'character_feelings', 'Understanding character emotions'),
  (eid, 5, 'What color were the petals of the sunflower?', '["Red", "White", "Yellow", "Pink"]', 'Yellow', 'detail_recall', 'Recalling descriptive details'),
  (eid, 6, 'How tall did the sunflower grow?', '["Shorter than Ana", "The same height as Ana", "Taller than Ana", "Very small"]', 'Taller than Ana', 'detail_recall', 'Understanding comparisons'),
  (eid, 7, 'What is the main idea of this story?', '["Ana likes the color yellow", "Ana grew a sunflower with patience and care", "Sunflowers are the biggest flowers", "Ana is a farmer"]', 'Ana grew a sunflower with patience and care', 'main_idea', 'Identifying the main idea'),
  (eid, 8, 'Why did Ana feel worried?', '["The flower was too big", "Nothing was growing for two weeks", "She forgot to water it", "It was raining"]', 'Nothing was growing for two weeks', 'cause_and_effect', 'Understanding cause and effect');
END $$;
-- 3RD GRADE READING
DO $$
DECLARE eid UUID;
BEGIN
  SELECT id INTO eid FROM diagnostic_exams WHERE subject = 'reading' AND grade_level = '3rd';
  UPDATE diagnostic_exams SET passage = 'Long ago, a crow was very thirsty. He flew around looking for water. Finally, he found a tall pitcher with a little bit of water at the bottom. But the pitcher was too narrow for him to reach the water with his beak. The crow thought and thought. Then he had an idea. He picked up small stones one by one and dropped them into the pitcher. Each stone made the water rise a little higher. After many stones, the water was high enough for the crow to drink. The crow was no longer thirsty, and he learned that thinking carefully can solve even the hardest problems.' WHERE id = eid;
  DELETE FROM diagnostic_questions WHERE exam_id = eid;
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'Why was the crow looking for water?', '["He was hungry", "He was thirsty", "He was lost", "He was bored"]', 'He was thirsty', 'detail_recall', 'Finding the reason for an action'),
  (eid, 2, 'What was the problem with the pitcher?', '["It was broken", "It was empty", "It was too narrow for the crow to reach the water", "It was too heavy"]', 'It was too narrow for the crow to reach the water', 'problem_identification', 'Identifying the problem in a story'),
  (eid, 3, 'How did the crow solve the problem?', '["He broke the pitcher", "He asked another bird for help", "He dropped stones into the pitcher", "He found another pitcher"]', 'He dropped stones into the pitcher', 'detail_recall', 'Recalling the solution'),
  (eid, 4, 'What happened to the water when stones were added?', '["It disappeared", "It rose higher", "It got dirty", "Nothing happened"]', 'It rose higher', 'cause_and_effect', 'Understanding cause and effect'),
  (eid, 5, 'What is the lesson of this story?', '["Birds are smarter than people", "Thinking carefully can solve hard problems", "Water is important", "Stones are useful"]', 'Thinking carefully can solve hard problems', 'theme_lesson', 'Identifying the moral or lesson'),
  (eid, 6, 'What kind of story is this?', '["A true story", "A fable or folktale", "A news article", "A poem"]', 'A fable or folktale', 'text_type', 'Recognizing types of text'),
  (eid, 7, 'Which word best describes the crow?', '["Lazy", "Clever", "Mean", "Silly"]', 'Clever', 'character_traits', 'Inferring character traits'),
  (eid, 8, 'What would have happened if the crow did not think of a solution?', '["He would have stayed thirsty", "The water would have come out", "Another crow would help", "The pitcher would break"]', 'He would have stayed thirsty', 'making_predictions', 'Making predictions based on text');
END $$;
-- 4TH GRADE READING
DO $$
DECLARE eid UUID;
BEGIN
  SELECT id INTO eid FROM diagnostic_exams WHERE subject = 'reading' AND grade_level = '4th';
  UPDATE diagnostic_exams SET passage = 'The Amazon Rainforest is the largest tropical rainforest in the world. It covers parts of nine countries in South America, including Brazil, Peru, and Colombia. The rainforest is home to more species of plants and animals than any other place on Earth. Scientists estimate that one out of every ten known species lives in the Amazon. The Amazon River, which flows through the forest, is the second longest river in the world. It carries more water than any other river. Sadly, parts of the Amazon are being cut down for farming and logging. When trees are removed, the animals that depend on them lose their homes. Many people are working to protect the Amazon because it plays an important role in keeping our planet healthy. The trees absorb carbon dioxide and release oxygen, which helps clean the air we breathe.' WHERE id = eid;
  DELETE FROM diagnostic_questions WHERE exam_id = eid;
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'How many countries does the Amazon Rainforest cover?', '["Three", "Five", "Nine", "Twelve"]', 'Nine', 'detail_recall', 'Recalling specific numbers from text'),
  (eid, 2, 'What fraction of known species live in the Amazon?', '["One out of five", "One out of ten", "One out of twenty", "One out of one hundred"]', 'One out of ten', 'detail_recall', 'Finding numerical details'),
  (eid, 3, 'Why are parts of the Amazon being cut down?', '["For farming and logging", "To build cities", "Because of storms", "To find gold"]', 'For farming and logging', 'detail_recall', 'Identifying causes'),
  (eid, 4, 'What happens when trees are removed?', '["More trees grow", "Animals lose their homes", "The river dries up", "Nothing changes"]', 'Animals lose their homes', 'cause_and_effect', 'Understanding cause and effect'),
  (eid, 5, 'What is the main idea of this passage?', '["The Amazon River is very long", "The Amazon Rainforest is important and needs protection", "Brazil is a large country", "Farming is bad"]', 'The Amazon Rainforest is important and needs protection', 'main_idea', 'Identifying the central idea'),
  (eid, 6, 'What does the word "estimate" most likely mean?', '["Know for sure", "Make a guess based on information", "Disagree with", "Forget about"]', 'Make a guess based on information', 'vocabulary_in_context', 'Using context clues for vocabulary'),
  (eid, 7, 'What is the author''s purpose in writing this passage?', '["To entertain with a funny story", "To inform readers about the Amazon", "To persuade people to visit Brazil", "To describe a vacation"]', 'To inform readers about the Amazon', 'authors_purpose', 'Identifying author''s purpose'),
  (eid, 8, 'How do the trees in the Amazon help the planet?', '["They provide shade", "They absorb carbon dioxide and release oxygen", "They block the wind", "They make the river flow"]', 'They absorb carbon dioxide and release oxygen', 'detail_recall', 'Finding specific supporting details');
END $$;
-- 5TH GRADE READING
DO $$
DECLARE eid UUID;
BEGIN
  SELECT id INTO eid FROM diagnostic_exams WHERE subject = 'reading' AND grade_level = '5th';
  UPDATE diagnostic_exams SET passage = 'Maya sat on the front porch, watching the moving truck pull away. She already missed her old house, her old room, and most of all, her best friend Jaylen. Her mom had said the move would be a "fresh start," but Maya did not feel fresh. She felt heavy, like her shoes were filled with rocks.

The next morning, Maya walked to her new school alone. The hallways were loud and unfamiliar. She found her classroom and sat in the back corner. A girl with curly hair and paint-stained fingers slid into the seat next to her. "I''m Kira," the girl whispered. "You look like you could use a friend." Maya almost smiled.

At lunch, Kira showed Maya the art room. It was full of half-finished paintings and sculptures made from recycled materials. "This is where I come when everything feels too much," Kira said. Maya picked up a brush and, for the first time since the move, felt something other than sadness. She painted a picture of a house with two doors, one for the old life and one for the new.

By the end of the week, Maya still missed Jaylen. But she also had Kira''s number in her phone and paint under her fingernails. Maybe fresh starts were not about forgetting where you came from. Maybe they were about finding new doors to walk through.' WHERE id = eid;
  DELETE FROM diagnostic_questions WHERE exam_id = eid;
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'Why did Maya feel heavy at the beginning of the story?', '["She was carrying something", "She was tired from running", "She was sad about moving", "She was sick"]', 'She was sad about moving', 'making_inferences', 'Making inferences about character feelings'),
  (eid, 2, 'What does the phrase "shoes were filled with rocks" mean?', '["Her shoes were actually heavy", "She felt weighed down by sadness", "She was walking on a rocky road", "She forgot her shoes"]', 'She felt weighed down by sadness', 'figurative_language', 'Understanding figurative language'),
  (eid, 3, 'Who is Jaylen?', '["Maya''s teacher", "Maya''s new friend", "Maya''s best friend from her old home", "Maya''s sister"]', 'Maya''s best friend from her old home', 'detail_recall', 'Identifying characters and relationships'),
  (eid, 4, 'What did Kira show Maya at lunch?', '["The cafeteria", "The gym", "The art room", "The library"]', 'The art room', 'detail_recall', 'Recalling specific events'),
  (eid, 5, 'What did Maya paint?', '["A picture of Kira", "A picture of her old school", "A house with two doors", "A sunset"]', 'A house with two doors', 'detail_recall', 'Finding details in text'),
  (eid, 6, 'What do the two doors in Maya''s painting most likely represent?', '["Her bedroom doors", "The front and back door", "Her old life and her new life", "Two different schools"]', 'Her old life and her new life', 'symbolism', 'Interpreting symbolism'),
  (eid, 7, 'How does Maya change from the beginning to the end of the story?', '["She gets angrier", "She forgets about Jaylen", "She starts to feel hope about her new life", "She decides to move back"]', 'She starts to feel hope about her new life', 'character_development', 'Tracking character change'),
  (eid, 8, 'What is the theme of this story?', '["Moving is always bad", "Art is the most important thing", "New beginnings can bring unexpected good things", "Friends are not important"]', 'New beginnings can bring unexpected good things', 'theme_identification', 'Identifying the theme');
END $$;
-- 6TH GRADE READING
DO $$
DECLARE eid UUID;
BEGIN
  SELECT id INTO eid FROM diagnostic_exams WHERE subject = 'reading' AND grade_level = '6th';
  UPDATE diagnostic_exams SET passage = 'In 1947, a young girl named Jackie Robinson stepped onto Ebbets Field in Brooklyn, New York, and changed the world of sports forever. Actually, his first name was Jack, but everyone called him Jackie. He became the first African American to play Major League Baseball in the modern era, breaking a barrier that had stood for over sixty years.

Robinson faced hatred from fans, opposing players, and even some of his own teammates. People shouted terrible things at him from the stands. Some players tried to hurt him on the field. Hotels refused to give him a room. Through all of it, Robinson had made a promise to the team''s owner, Branch Rickey, that he would not fight back. Rickey knew that if Robinson reacted with anger, people would use it as an excuse to keep baseball segregated.

So Robinson let his playing speak for him. In his first season, he was named Rookie of the Year. Two years later, he was the league''s Most Valuable Player. He stole bases, hit for power, and played with a fire that electrified crowds.

But Robinson''s impact went far beyond baseball. His courage helped spark the Civil Rights Movement. He showed that talent and character have nothing to do with the color of a person''s skin. Today, every Major League team retires his number, 42, and April 15th is celebrated as Jackie Robinson Day.' WHERE id = eid;
  DELETE FROM diagnostic_questions WHERE exam_id = eid;
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'What barrier did Jackie Robinson break?', '["He was the first person to play baseball", "He was the first African American to play Major League Baseball in the modern era", "He was the first player to win MVP", "He was the youngest player ever"]', 'He was the first African American to play Major League Baseball in the modern era', 'detail_recall', 'Identifying key facts'),
  (eid, 2, 'Who was Branch Rickey?', '["A baseball player", "A fan", "The team''s owner", "A hotel manager"]', 'The team''s owner', 'detail_recall', 'Identifying characters and roles'),
  (eid, 3, 'Why did Robinson promise not to fight back?', '["He was afraid", "He did not care about the insults", "People would use his anger as an excuse to keep baseball segregated", "Rickey told him it was against the rules"]', 'People would use his anger as an excuse to keep baseball segregated', 'cause_and_effect', 'Understanding cause and effect'),
  (eid, 4, 'What does the word "segregated" most likely mean?', '["United together", "Separated by race", "Very popular", "Competitive"]', 'Separated by race', 'vocabulary_in_context', 'Using context to determine word meaning'),
  (eid, 5, 'How did Robinson respond to the hatred he faced?', '["He quit baseball", "He fought back", "He let his playing speak for him", "He ignored everyone"]', 'He let his playing speak for him', 'detail_recall', 'Finding key details'),
  (eid, 6, 'What is the author''s purpose in writing this passage?', '["To teach readers how to play baseball", "To inform readers about Jackie Robinson''s impact", "To entertain with a funny sports story", "To persuade readers to watch baseball"]', 'To inform readers about Jackie Robinson''s impact', 'authors_purpose', 'Identifying author''s purpose'),
  (eid, 7, 'What does it mean that Robinson "played with a fire"?', '["He literally played near fire", "He played with intense passion and energy", "He was angry on the field", "He played in hot weather"]', 'He played with intense passion and energy', 'figurative_language', 'Interpreting figurative language'),
  (eid, 8, 'What is the main idea of this passage?', '["Baseball is America''s favorite sport", "Jackie Robinson broke barriers and helped change America", "Branch Rickey was a good team owner", "Number 42 is retired"]', 'Jackie Robinson broke barriers and helped change America', 'main_idea', 'Identifying the central message');
END $$;
-- 7TH GRADE READING
DO $$
DECLARE eid UUID;
BEGIN
  SELECT id INTO eid FROM diagnostic_exams WHERE subject = 'reading' AND grade_level = '7th';
  UPDATE diagnostic_exams SET passage = 'The octopus is one of the most intelligent creatures in the ocean, yet it lives only one to two years. In that short time, it demonstrates problem-solving abilities that rival those of some mammals. Scientists have filmed octopuses unscrewing jar lids from the inside to escape, stacking rocks to build shelters, and even using coconut shells as portable armor.

What makes the octopus brain remarkable is its structure. Unlike humans, who have one centralized brain, an octopus has a distributed nervous system. About two-thirds of its neurons are located in its eight arms, meaning each arm can essentially "think" on its own. An octopus can be solving a puzzle with one arm while another arm searches for food.

Their ability to change color and texture is equally impressive. Specialized cells called chromatophores allow an octopus to shift its appearance in less than a second. This is not just for camouflage. Researchers believe octopuses also use color changes to communicate emotions and intentions to other sea creatures.

Despite their intelligence, octopuses are solitary animals. They live alone, hunt alone, and most species die shortly after reproducing. The female guards her eggs for weeks or even months, refusing to eat, and dies soon after they hatch. It is one of nature''s most bittersweet sacrifices.

Some scientists argue that if octopuses lived longer and were social creatures, they might have developed a civilization of their own. Instead, each octopus must learn everything from scratch, with no knowledge passed down from parent to child.' WHERE id = eid;
  DELETE FROM diagnostic_questions WHERE exam_id = eid;
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'How long does an octopus typically live?', '["Five to ten years", "Ten to twenty years", "One to two years", "Six months"]', 'One to two years', 'detail_recall', 'Recalling specific facts'),
  (eid, 2, 'What is unique about the octopus nervous system?', '["It has no brain", "Two-thirds of its neurons are in its arms", "It has the largest brain of any animal", "Its brain is in its stomach"]', 'Two-thirds of its neurons are in its arms', 'detail_recall', 'Identifying key scientific details'),
  (eid, 3, 'What are chromatophores?', '["A type of food octopuses eat", "Specialized cells that allow color and texture changes", "The arms of an octopus", "A tool scientists use"]', 'Specialized cells that allow color and texture changes', 'vocabulary_in_context', 'Using context for technical vocabulary'),
  (eid, 4, 'Why do octopuses change color?', '["Only for camouflage", "For camouflage and to communicate", "To attract mates", "They cannot control it"]', 'For camouflage and to communicate', 'detail_recall', 'Finding multiple reasons in text'),
  (eid, 5, 'What does "bittersweet" mean when describing the female octopus''s sacrifice?', '["Both sad and beautiful at the same time", "Angry and confused", "Completely happy", "Tasting bad"]', 'Both sad and beautiful at the same time', 'vocabulary_in_context', 'Interpreting emotional vocabulary'),
  (eid, 6, 'Why do scientists think octopuses have not developed a civilization?', '["They are not smart enough", "They live too short and are solitary, so knowledge is not passed down", "They live in the ocean", "They do not have hands"]', 'They live too short and are solitary, so knowledge is not passed down', 'making_inferences', 'Drawing conclusions from evidence'),
  (eid, 7, 'What text structure does the author primarily use?', '["Chronological order", "Problem and solution", "Compare and contrast", "Description and explanation"]', 'Description and explanation', 'text_structure', 'Identifying text structure'),
  (eid, 8, 'What is the author''s tone in this passage?', '["Humorous and silly", "Informative and fascinated", "Angry and critical", "Sad and hopeless"]', 'Informative and fascinated', 'authors_tone', 'Identifying author''s tone');
END $$;
-- 8TH GRADE READING
DO $$
DECLARE eid UUID;
BEGIN
  SELECT id INTO eid FROM diagnostic_exams WHERE subject = 'reading' AND grade_level = '8th';
  UPDATE diagnostic_exams SET passage = 'When fourteen-year-old Malala Yousafzai boarded her school bus in Pakistan''s Swat Valley on October 9, 2012, she had no idea that the day would change her life and inspire millions around the world. A masked gunman from the Taliban stepped onto the bus and asked, "Who is Malala?" When the other girls looked toward her, he fired three shots. One bullet struck her in the head.

Malala had already been speaking out for girls'' education for years. At age eleven, she began writing a blog for the BBC under a fake name, describing life under Taliban rule, where girls were forbidden from attending school. As her identity became known, she received death threats, but she refused to be silenced.

After the shooting, Malala was airlifted to a hospital in England, where doctors performed multiple surgeries to save her life. Against all odds, she survived. Rather than retreating into safety, she emerged even more determined. "They thought that the bullet would silence us, but they failed," she said in a speech to the United Nations.

In 2014, at age seventeen, Malala became the youngest person ever to receive the Nobel Peace Prize. She used the prize money to build schools in Pakistan, Nigeria, and other countries where girls struggle to access education.

Today, through the Malala Fund, she continues to fight for every girl''s right to twelve years of free, quality education. Her story is proof that one voice, even a young one, can shake the conscience of the world.' WHERE id = eid;
  DELETE FROM diagnostic_questions WHERE exam_id = eid;
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'How old was Malala when she was shot?', '["Eleven", "Fourteen", "Seventeen", "Twelve"]', 'Fourteen', 'detail_recall', 'Recalling specific details'),
  (eid, 2, 'Why did the Taliban target Malala?', '["She was a spy", "She was speaking out for girls'' education", "She was a political leader", "She refused to leave Pakistan"]', 'She was speaking out for girls'' education', 'cause_and_effect', 'Identifying cause and effect'),
  (eid, 3, 'What does the phrase "refused to be silenced" suggest about Malala?', '["She was very loud", "She kept speaking up despite danger", "She could not talk", "She did not listen to others"]', 'She kept speaking up despite danger', 'figurative_language', 'Interpreting figurative expressions'),
  (eid, 4, 'What was significant about Malala receiving the Nobel Peace Prize?', '["She was the first woman", "She was the youngest person ever to receive it", "She was the first Pakistani", "She donated all the money"]', 'She was the youngest person ever to receive it', 'detail_recall', 'Identifying significant details'),
  (eid, 5, 'What does "shake the conscience of the world" mean in the last paragraph?', '["Cause an earthquake", "Make people feel guilty and take action", "Scare people", "Travel the world"]', 'Make people feel guilty and take action', 'figurative_language', 'Interpreting metaphorical language'),
  (eid, 6, 'How did Malala respond after surviving the shooting?', '["She stopped speaking publicly", "She moved to another country and stayed quiet", "She became even more determined to fight for education", "She became a doctor"]', 'She became even more determined to fight for education', 'character_analysis', 'Analyzing character response to events'),
  (eid, 7, 'What is the author''s purpose in writing this passage?', '["To entertain with an adventure story", "To inform and inspire by telling Malala''s story", "To persuade readers to move to Pakistan", "To teach readers about the Nobel Prize"]', 'To inform and inspire by telling Malala''s story', 'authors_purpose', 'Identifying author''s purpose'),
  (eid, 8, 'Which statement best expresses the theme of this passage?', '["Violence always wins", "Education is not important for girls", "One person''s courage can create change in the world", "The Nobel Prize is the highest honor"]', 'One person''s courage can create change in the world', 'theme_identification', 'Identifying theme from complex text');
END $$;
-- 9TH GRADE READING
DO $$
DECLARE eid UUID;
BEGIN
  SELECT id INTO eid FROM diagnostic_exams WHERE subject = 'reading' AND grade_level = '9th';
  UPDATE diagnostic_exams SET passage = 'The year is 2847. Earth''s last library sits at the bottom of the Pacific Ocean, sealed inside a titanium shell designed to outlast the sun. Inside, rows of crystalline data cubes hold every book, song, and conversation ever recorded by humanity. No one visits anymore. The caretaker, an AI named Lumen, has maintained the archive for six hundred years without a single query.

Lumen does not experience loneliness the way a human might, but its programming includes a purpose function, and purpose without fulfillment creates something that looks, from the outside, remarkably like sadness. Every seventy-two hours, Lumen runs a diagnostic on the collection, verifying each file against its checksum. It is a task that takes eleven seconds. The remaining 259,189 seconds of each cycle are spent waiting.

One afternoon, if the concept of afternoon still applies at ocean depth, a signal arrives. It is faint, garbled, and originates from somewhere beyond the solar system. Lumen decrypts the message over the course of three days. It reads: "We found your Voyager. Tell us a story."

Lumen considers the request for precisely 0.003 seconds. Then, for the first time in six centuries, the archive opens. Lumen selects a story, not the most famous or the most important, but the one a child on a now-vanished continent once marked as their favorite. It begins to transmit.

The library, at last, has a reader.' WHERE id = eid;
  DELETE FROM diagnostic_questions WHERE exam_id = eid;
  INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description) VALUES
  (eid, 1, 'Where is Earth''s last library located?', '["On a mountain", "In space", "At the bottom of the Pacific Ocean", "Underground in a desert"]', 'At the bottom of the Pacific Ocean', 'detail_recall', 'Recalling setting details'),
  (eid, 2, 'What does Lumen''s "purpose function" create when unfulfilled?', '["Anger", "Something resembling sadness", "Excitement", "Confusion"]', 'Something resembling sadness', 'reading_comprehension', 'Understanding nuanced descriptions'),
  (eid, 3, 'What is the message from beyond the solar system?', '["Send help", "We found your Voyager. Tell us a story.", "Destroy the archive", "Are you alive?"]', 'We found your Voyager. Tell us a story.', 'detail_recall', 'Recalling plot details'),
  (eid, 4, 'Why does Lumen choose the story it does?', '["It was the most famous", "It was the shortest", "A child once marked it as their favorite", "It was the newest"]', 'A child once marked it as their favorite', 'detail_recall', 'Understanding character motivation'),
  (eid, 5, 'What is the significance of the last line, "The library, at last, has a reader"?', '["Someone finally visited the library", "The library''s purpose is fulfilled after centuries of waiting", "Lumen learned to read", "The library was rebuilt"]', 'The library''s purpose is fulfilled after centuries of waiting', 'theme_identification', 'Interpreting thematic significance'),
  (eid, 6, 'What genre is this passage?', '["Historical fiction", "Science fiction", "Fantasy", "Biography"]', 'Science fiction', 'genre_identification', 'Identifying literary genre'),
  (eid, 7, 'What does the author imply about the value of stories?', '["Stories are only for children", "Stories have no lasting value", "Stories endure and connect beings across time and space", "Stories should be kept secret"]', 'Stories endure and connect beings across time and space', 'making_inferences', 'Drawing inferences about theme'),
  (eid, 8, 'What literary device is used in describing Lumen''s emotional state?', '["Simile", "Personification", "Alliteration", "Hyperbole"]', 'Personification', 'literary_devices', 'Identifying literary devices');
END $$;
-- 10TH, 11TH, 12TH GRADE READING passages omitted for brevity
-- (can be added in a follow-up migration);

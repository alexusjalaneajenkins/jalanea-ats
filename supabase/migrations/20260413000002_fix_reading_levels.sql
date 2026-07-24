-- Fix 5th grade reading passage (was FK 4.0, needs to be ~5.0)
-- Changes: longer sentences, more complex vocabulary, added compound sentences
UPDATE diagnostic_exams
SET passage = 'Maya sat on the front porch and watched the moving truck disappear around the corner. She already missed her old house, her old bedroom with the glow-in-the-dark stars on the ceiling, and most of all, her best friend Jaylen, who had promised to video call every day. Her mom kept saying the move would be a "fresh start," but Maya did not understand what was so fresh about leaving behind everything she loved. She felt heavy inside, as if her chest were filled with stones.

The next morning was her first day at Riverside Middle School. The hallways were crowded and confusing, with students rushing past her like she was invisible. Eventually, she found Room 214 and slid into a desk near the back corner, hoping nobody would notice her. A girl with curly brown hair and paint-stained fingers leaned over from the next seat. "I am Kira," she whispered. "You look like someone who could use a guide around here." Maya managed a small smile but did not say anything.

During lunch, Kira led Maya through a maze of hallways to the art room, which was tucked behind the gymnasium. The room was filled with half-finished canvases, clay sculptures, and mobiles made from recycled bottles and wire. "This is my favorite place in the whole school," Kira explained. "Whenever everything feels overwhelming, I come here and create something." Maya hesitated, then picked up a paintbrush and dipped it into blue paint. For the first time since the move, the heaviness in her chest loosened just a little. She painted a picture of a house with two doors standing open, one leading backward and one leading forward.

By Friday, Maya still missed Jaylen terribly. But she had also saved Kira''s phone number, and there was dried paint beneath her fingernails that she did not want to wash off. Perhaps a fresh start was not about forgetting where you came from. Perhaps it was about discovering new doors you never expected to find.'
WHERE subject = 'reading' AND grade_level = '5th';
-- Fix 7th grade reading passage (was FK 10.2, needs to be ~7.0)
-- Changes: shorter sentences, simpler vocabulary, removed technical terms like chromatophores
UPDATE diagnostic_exams
SET passage = 'The octopus might be the smartest animal in the ocean, but it only lives for about one to two years. In that short life, it can do things that surprise even scientists. Octopuses have been filmed opening jars from the inside to escape, piling up rocks to make shelters, and carrying coconut shells around to use as shields. They are natural problem solvers.

What makes the octopus brain so unusual is where it is located. Humans keep all their thinking in one brain inside their head. An octopus is different. Most of its brain cells are spread out across its eight arms. Each arm can act on its own, almost like it has its own mind. One arm might be working on a puzzle while another arm is searching for food nearby.

Octopuses can also change their color and the feel of their skin in less than one second. They have special cells in their skin that make this possible. Most people think this is just for hiding, but scientists now believe octopuses also change color to show how they are feeling or to send messages to other animals in the water.

Even though they are so clever, octopuses live alone. They hunt by themselves and do not form groups or families. After a mother octopus lays her eggs, she watches over them for weeks without eating anything. She usually dies shortly after her babies hatch. It is one of the saddest things in nature.

Some researchers wonder what would happen if octopuses could live longer and spend time together. Maybe they would have built their own underwater cities. But because each octopus starts life alone, with no parent to teach it anything, every single octopus has to figure out the world all by itself.'
WHERE subject = 'reading' AND grade_level = '7th';
-- Also fix 4th grade (was FK ~6.0, needs to be ~4.0)
-- Changes: shorter sentences, simpler words
UPDATE diagnostic_exams
SET passage = 'The Amazon Rainforest is the biggest tropical forest in the world. It stretches across nine countries in South America, including Brazil, Peru, and Colombia. More types of plants and animals live in the Amazon than anywhere else on Earth. Scientists think that one out of every ten known species calls the Amazon home.

The Amazon River flows through the middle of the forest. It is the second longest river in the world, and it carries more water than any other river. During the rainy season, parts of the forest flood, and fish swim between the trees.

Sadly, people are cutting down parts of the Amazon to make room for farms and to sell the wood. When the trees are removed, the animals that live in them lose their homes. Birds lose their nests. Monkeys lose the branches they swing from. Frogs lose the ponds that form under the leaves.

Many people around the world are working to protect the Amazon. The trees in the forest take in a gas called carbon dioxide and let out oxygen, which is the air we need to breathe. Without the Amazon, the air on our whole planet would be less clean. That is why some people call the Amazon the lungs of the Earth.'
WHERE subject = 'reading' AND grade_level = '4th';
-- Fix 6th grade (was FK ~7.5, needs to be ~6.0)
-- Changes: break up long sentences, simplify some vocabulary
UPDATE diagnostic_exams
SET passage = 'In 1947, Jackie Robinson walked onto Ebbets Field in Brooklyn, New York, and changed sports forever. He became the first African American to play Major League Baseball in the modern era. Before him, Black players had been kept out of the major leagues for over sixty years.

Robinson faced a lot of hatred. Fans yelled terrible things at him from the stands. Some players on other teams tried to hurt him during games. Hotels refused to let him stay in their rooms. Even a few of his own teammates did not want him on the team at first.

Before the season started, the team owner, Branch Rickey, had asked Robinson to make a difficult promise. Rickey told him not to fight back, no matter what happened. Rickey knew that if Robinson lost his temper, people would use it as a reason to keep baseball separated by race. Robinson agreed, even though it meant staying silent when people treated him cruely.

Instead of fighting, Robinson let his skills do the talking. In his first year, he won Rookie of the Year. Two years later, he was named the league''s Most Valuable Player. He was fast on the bases, powerful at bat, and exciting to watch.

Robinson''s bravery did more than change baseball. It helped start the Civil Rights Movement in America. He proved that a person''s talent and character have nothing to do with skin color. Today, no player on any Major League team is allowed to wear the number 42, because that number belongs to Jackie Robinson. Every year on April 15th, the whole league celebrates Jackie Robinson Day in his honor.'
WHERE subject = 'reading' AND grade_level = '6th';
-- Update the 7th grade questions to match simplified passage
DELETE FROM diagnostic_questions WHERE exam_id = (SELECT id FROM diagnostic_exams WHERE subject = 'reading' AND grade_level = '7th');
INSERT INTO diagnostic_questions (exam_id, question_number, prompt, options, correct_answer, skill_tag, skill_description)
SELECT id, q.question_number, q.prompt, q.options::jsonb, q.correct_answer, q.skill_tag, q.skill_description
FROM diagnostic_exams, (VALUES
  (1, 'How long does an octopus usually live?', '["Five to ten years", "Ten to twenty years", "One to two years", "Six months"]', 'One to two years', 'detail_recall', 'Recalling specific facts'),
  (2, 'What is special about where the octopus brain cells are located?', '["They are all in its head", "Most of them are spread across its eight arms", "It has no brain cells", "They are in its stomach"]', 'Most of them are spread across its eight arms', 'detail_recall', 'Identifying key details'),
  (3, 'How do octopuses change their color?', '["They use paint", "They have special cells in their skin", "They only change in the dark", "Scientists do not know"]', 'They have special cells in their skin', 'detail_recall', 'Finding specific information'),
  (4, 'Why do octopuses change color?', '["Only to hide from enemies", "To hide and to send messages to other animals", "To look pretty", "They cannot control it"]', 'To hide and to send messages to other animals', 'detail_recall', 'Finding multiple reasons in text'),
  (5, 'What happens to a mother octopus after her eggs hatch?', '["She teaches her babies to hunt", "She finds a new home", "She usually dies", "She swims away"]', 'She usually dies', 'detail_recall', 'Recalling important details'),
  (6, 'Why can octopuses not pass knowledge to their children?', '["They are not smart enough", "They live alone and die before their babies grow up", "Baby octopuses cannot learn", "They live too deep in the ocean"]', 'They live alone and die before their babies grow up', 'making_inferences', 'Drawing conclusions from evidence'),
  (7, 'What is the main idea of this passage?', '["Octopuses are dangerous animals", "Octopuses are surprisingly smart but live short, lonely lives", "The ocean is full of mysteries", "Scientists should study more animals"]', 'Octopuses are surprisingly smart but live short, lonely lives', 'main_idea', 'Identifying the central message'),
  (8, 'What is the author''s tone in this passage?', '["Angry and upset", "Funny and silly", "Interested and a little sad", "Bored and uninterested"]', 'Interested and a little sad', 'authors_tone', 'Identifying author''s tone')
) AS q(question_number, prompt, options, correct_answer, skill_tag, skill_description)
WHERE diagnostic_exams.subject = 'reading' AND diagnostic_exams.grade_level = '7th';

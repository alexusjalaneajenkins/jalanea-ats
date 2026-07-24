-- Student curriculum reads now go through createVerifiedStudentClient and a
-- server-only service-role client. Keep the staff RLS policy for authenticated
-- tutor access, but remove every direct Data API privilege from anon so a
-- guessed student id can never become a curriculum-assignment oracle.
REVOKE ALL ON TABLE public.curriculum_assignments FROM anon;

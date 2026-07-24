-- Correct the table-level privilege surface after the curriculum topic table
-- was created. RLS controls rows, but TRUNCATE is a table privilege and bypasses
-- RLS entirely, so authenticated must receive an explicit minimal grant set.

REVOKE ALL PRIVILEGES ON TABLE public.curriculum_topic_records
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.curriculum_topic_records
  TO authenticated;
-- Server-side operational access remains available to Supabase's privileged
-- role. Application clients never receive this credential.
GRANT ALL PRIVILEGES ON TABLE public.curriculum_topic_records
  TO service_role;

-- Allow linking multiple diagnostic attempts to a session note
-- via a junction table instead of a single FK

CREATE TABLE session_diagnostic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_note_id UUID NOT NULL REFERENCES tutor_session_notes(id) ON DELETE CASCADE,
  diagnostic_attempt_id UUID NOT NULL REFERENCES diagnostic_attempts(id) ON DELETE CASCADE,
  UNIQUE(session_note_id, diagnostic_attempt_id)
);
CREATE INDEX idx_session_diag_links_session ON session_diagnostic_links(session_note_id);
ALTER TABLE session_diagnostic_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tutors manage session diagnostic links"
  ON session_diagnostic_links FOR ALL
  USING (true);

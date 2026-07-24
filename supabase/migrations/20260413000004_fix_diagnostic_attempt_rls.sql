-- Fix: Students need to UPDATE diagnostic_attempts to mark exams as completed.
-- The existing "Students read their attempts" policy was SELECT-only.
-- Add an UPDATE policy so completeDiagnosticAttempt can set status = 'completed'.

CREATE POLICY "Students can complete their attempts"
  ON diagnostic_attempts FOR UPDATE
  USING (true);

-- ────────────────────────────────────────────────────────────────────
-- Sensory settings (Wave 1 — the design's Comfort Settings)
--
-- One row per student: the 9-key settings document from the design
-- (scale, font, theme, contrast, aloud, sounds, motion, calm, breaks).
-- Server is source of truth so settings follow the student across
-- devices; localStorage (jalanea-sensory-v1) is the offline cache.
--
-- RLS: open read/write like the rest of the cookie-auth student
-- surface — identity is enforced in the server actions (cookie), and
-- nothing here is sensitive. Tightens later with the service-role work.
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE student_sensory_settings (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE student_sensory_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open read sensory settings"
  ON student_sensory_settings FOR SELECT USING (true);
CREATE POLICY "Open insert sensory settings"
  ON student_sensory_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Open update sensory settings"
  ON student_sensory_settings FOR UPDATE USING (true) WITH CHECK (true);

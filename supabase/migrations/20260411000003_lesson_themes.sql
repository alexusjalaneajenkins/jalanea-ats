-- Add theme column to lessons table
ALTER TABLE lessons ADD COLUMN theme TEXT NOT NULL DEFAULT 'default';

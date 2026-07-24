-- 3-Strike attendance tracking system
--
-- Adds:
-- 1. 'paused' value to student_access_status enum (for auto-pause at Strike 3)
-- 2. Reinstatement tracking columns on students
-- 3. Excused reason column on session_logs (to distinguish excused vs unexcused no-shows)
--
-- NOTE: ALTER TYPE ADD VALUE commits immediately and cannot be used in the same
-- transaction as queries referencing the new value. The partial index for paused
-- students is deferred to a separate migration if needed.

-- ─── Add 'paused' to student_access_status enum ───

alter type public.student_access_status add value if not exists 'paused' after 'active';
-- ─── Add attendance tracking columns to students ───

alter table public.students
  add column if not exists paused_at timestamptz,
  add column if not exists paused_reason text,
  add column if not exists reinstatement_requested_at timestamptz,
  add column if not exists reinstatement_notes text;
-- ─── Add excused tracking to session_logs ───

-- When a no-show is excused (guardian communicated), this stores the reason.
-- If excused_reason is NOT NULL and outcome = 'no_show', no strike was issued.
alter table public.session_logs
  add column if not exists excused_reason text;

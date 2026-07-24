-- Session logging and strike tracking for Jalanea Tutor Platform
--
-- This migration adds two tables:
-- 1. session_logs: records outcome, notes, and Google Calendar link for each session
-- 2. strikes: tracks the 3-strike attendance system, auto-populated on no-show logs
--
-- Design decisions:
-- - session_logs uses gcal_event_id (text) as the link to Google Calendar events,
--   NOT a foreign key to students, because the schedule grid is driven by Google
--   Calendar and students may not yet exist in Supabase when a session is logged.
-- - student_name is stored directly (denormalized) so the strikes page works
--   even for students not yet in the students table.
-- - student_id is optional: set when the student exists in Supabase, null otherwise.
-- - tutor_profile_id references the logged-in tutor (from Supabase Auth profiles).

-- ─── Enum: session outcome ───

do $$
begin
  if not exists (select 1 from pg_type where typname = 'session_outcome') then
    create type public.session_outcome as enum ('completed', 'no_show', 'late_cancel');
  end if;
end
$$;
-- ─── Table: session_logs ───

create table if not exists public.session_logs (
  id uuid primary key default gen_random_uuid(),

  -- Who logged this
  tutor_profile_id uuid not null references public.profiles(id) on delete cascade,

  -- Link to Google Calendar event (the source of truth for scheduling)
  gcal_event_id text not null,

  -- Denormalized session info (from the calendar event at time of logging)
  student_name text not null,
  subject text,
  session_date date not null,
  session_start timestamptz not null,
  session_end timestamptz not null,

  -- Optional link to students table (added as plain uuid for now;
  -- foreign key constraint will be added when the students table is created)
  student_id uuid,

  -- Outcome
  outcome public.session_outcome not null,
  notes text,

  -- Whether a strike was issued (only relevant for no_show / late_cancel)
  strike_issued boolean not null default false,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One log per calendar event
  constraint session_logs_gcal_event_unique unique (gcal_event_id)
);
-- Indexes for common queries
create index if not exists idx_session_logs_tutor on public.session_logs(tutor_profile_id);
create index if not exists idx_session_logs_student on public.session_logs(student_id) where student_id is not null;
create index if not exists idx_session_logs_date on public.session_logs(session_date desc);
create index if not exists idx_session_logs_gcal on public.session_logs(gcal_event_id);
-- ─── Table: strikes ───

create table if not exists public.strikes (
  id uuid primary key default gen_random_uuid(),

  -- Who issued the strike
  tutor_profile_id uuid not null references public.profiles(id) on delete cascade,

  -- Link back to the session log that triggered this strike
  session_log_id uuid not null references public.session_logs(id) on delete cascade,

  -- Denormalized student info (so strikes page works without joins to calendar)
  student_name text not null,
  subject text,
  strike_date date not null,

  -- Optional link to students table (plain uuid for now)
  student_id uuid,

  -- Strike type: which missed session type caused this
  strike_type public.session_outcome not null,

  -- Strike number for this student (1, 2, or 3)
  -- Computed at insert time based on existing strikes for this student_name + tutor
  strike_number int not null,

  -- Timestamps
  created_at timestamptz not null default now(),

  -- One strike per session log
  constraint strikes_session_log_unique unique (session_log_id)
);
create index if not exists idx_strikes_tutor on public.strikes(tutor_profile_id);
create index if not exists idx_strikes_student_name on public.strikes(student_name, tutor_profile_id);
create index if not exists idx_strikes_date on public.strikes(strike_date desc);
-- ─── RLS Policies ───

alter table public.session_logs enable row level security;
alter table public.strikes enable row level security;
-- Tutors can only see and manage their own session logs
create policy "Tutors manage own session logs"
  on public.session_logs
  for all
  using (tutor_profile_id = auth.uid())
  with check (tutor_profile_id = auth.uid());
-- Tutors can only see and manage their own strikes
create policy "Tutors manage own strikes"
  on public.strikes
  for all
  using (tutor_profile_id = auth.uid())
  with check (tutor_profile_id = auth.uid());
-- ─── Updated_at trigger ───

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
-- Only create the trigger if it doesn't already exist
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'session_logs_updated_at'
  ) then
    create trigger session_logs_updated_at
      before update on public.session_logs
      for each row
      execute function public.update_updated_at();
  end if;
end
$$;

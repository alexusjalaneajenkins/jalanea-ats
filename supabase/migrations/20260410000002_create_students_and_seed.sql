-- Create students + student_guardians tables and seed real student data.
--
-- The foundation migration (20260405000001) was marked as applied but never
-- actually ran on the remote. This migration re-creates the essential tables
-- with IF NOT EXISTS, then seeds the tutor's real student roster.

-- ─── Extensions (idempotent) ───

create extension if not exists pgcrypto;
create extension if not exists citext;
-- ─── Enum types (idempotent) ───

do $$
begin
  if not exists (select 1 from pg_type where typname = 'student_access_status') then
    create type public.student_access_status as enum ('invited', 'active', 'locked', 'archived');
  end if;
end
$$;
-- ─── Students table ───

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  external_student_id text unique,
  first_name text not null,
  last_name text,
  display_name text generated always as (btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) stored,
  grade_band text,
  primary_subjects text[] not null default '{}',
  session_type text,                    -- 'online', 'in-person', 'hybrid'
  session_location text,                -- e.g. 'Alafaya Library, Orlando FL'
  diagnoses text[] not null default '{}',
  accommodation_plan text,              -- 'IEP', '504 Plan', 'None'
  payer text,                           -- 'Private Pay', 'Aetna OhioRISE', etc.
  recurring_schedule text,              -- human-readable schedule description
  attention_notes text,
  sensory_load_notes text,
  emotional_regulation_notes text,
  status public.student_access_status not null default 'active',
  created_by_profile_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- ─── Student guardians table ───

create table if not exists public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  guardian_name text not null,
  relationship_to_student text,
  email citext,
  phone text,
  is_primary boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
-- ─── RLS ───

alter table public.students enable row level security;
alter table public.student_guardians enable row level security;
-- Drop policies if they exist (idempotent)
do $$ begin
  drop policy if exists "Tutors see own students" on public.students;
  drop policy if exists "Tutors manage own students" on public.students;
  drop policy if exists "Tutors see own student guardians" on public.student_guardians;
  drop policy if exists "Tutors manage own student guardians" on public.student_guardians;
end $$;
create policy "Tutors see own students"
  on public.students for select
  using (created_by_profile_id = auth.uid());
create policy "Tutors manage own students"
  on public.students for all
  using (created_by_profile_id = auth.uid())
  with check (created_by_profile_id = auth.uid());
create policy "Tutors see own student guardians"
  on public.student_guardians for select
  using (
    student_id in (select id from public.students where created_by_profile_id = auth.uid())
  );
create policy "Tutors manage own student guardians"
  on public.student_guardians for all
  using (
    student_id in (select id from public.students where created_by_profile_id = auth.uid())
  )
  with check (
    student_id in (select id from public.students where created_by_profile_id = auth.uid())
  );
-- ─── Indexes ───

create index if not exists idx_students_created_by on public.students(created_by_profile_id);
create index if not exists idx_student_guardians_student on public.student_guardians(student_id);
-- ─── Seed data ───
-- Clear any partial data from a previous failed run
delete from public.student_guardians where true;
delete from public.students where true;
-- Uses the tutor's profile ID from auth.users / profiles.
-- The tutor email is alexxusjenkins91@gmail.com.

do $$
declare
  tutor_id uuid;
  sid uuid;
begin
  -- Find the tutor's profile ID via auth.users (profiles may not have email column)
  select p.id into tutor_id
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email = 'alexxusjenkins91@gmail.com'
  limit 1;

  if tutor_id is null then
    -- Fallback: use the first profile
    select id into tutor_id from public.profiles limit 1;
  end if;

  if tutor_id is null then
    raise exception 'No tutor profile found. Sign in first, then re-run this migration.';
  end if;

  -- ─── 1. Nylah Phillips ───
  insert into public.students (first_name, last_name, grade_band, primary_subjects, session_type, diagnoses, accommodation_plan, payer, recurring_schedule, created_by_profile_id)
  values ('Nylah', 'Phillips', '6th', '{Reading}', 'online', '{Dyslexia}', 'None', 'WellCare NC', 'Wed 4:00-4:30 PM', tutor_id)
  returning id into sid;

  insert into public.student_guardians (student_id, guardian_name, phone, is_primary)
  values (sid, 'Vickie', '252-883-9799', true);

  -- ─── 2. Aubree Palguta ───
  insert into public.students (first_name, last_name, grade_band, primary_subjects, session_type, session_location, diagnoses, accommodation_plan, payer, recurring_schedule, attention_notes, created_by_profile_id)
  values ('Aubree', 'Palguta', '7th', '{Math,Science}', 'hybrid', 'Alafaya Library, Orlando FL', '{ASD,ADHD}', 'None', 'Aetna OhioRISE', 'Mon 3:45-4:45 PM recurring', 'Female tutor required', tutor_id)
  returning id into sid;

  insert into public.student_guardians (student_id, guardian_name, phone, is_primary)
  values (sid, 'Amy McSweeney', '330-880-1182', true);

  -- ─── 3. Alycia Wright ───
  insert into public.students (first_name, last_name, grade_band, primary_subjects, session_type, session_location, diagnoses, accommodation_plan, payer, recurring_schedule, created_by_profile_id)
  values ('Alycia', 'Wright', '8th', '{Math,Writing}', 'hybrid', 'Alafaya Library, Orlando FL', '{ADHD,ADD,ODD}', 'IEP', 'Private Pay', 'Tue + Fri 5:00-6:00 PM', tutor_id)
  returning id into sid;

  insert into public.student_guardians (student_id, guardian_name, phone, is_primary)
  values (sid, 'Charity Wright', '937-361-4625', true);

  -- ─── 4. Malachi Stewart ───
  insert into public.students (first_name, last_name, grade_band, primary_subjects, session_type, diagnoses, accommodation_plan, payer, recurring_schedule, sensory_load_notes, created_by_profile_id)
  values ('Malachi', 'Stewart', '6th', '{Reading,Math}', 'online', '{ASD,SPD}', 'None', 'Private Pay', 'Fri 6:30-7:30 PM (starts Apr 24 recurring)', 'Sibling group: Michael and Quincy Stewart', tutor_id)
  returning id into sid;

  insert into public.student_guardians (student_id, guardian_name, phone, is_primary)
  values (sid, 'Sheila Charles', '305-879-7399', true);

  -- ─── 5. Maddox Crouse ───
  insert into public.students (first_name, last_name, grade_band, primary_subjects, session_type, session_location, diagnoses, accommodation_plan, payer, recurring_schedule, created_by_profile_id)
  values ('Maddox', 'Crouse', '8th', '{Math,Science}', 'hybrid', 'Alafaya Library, Orlando FL', '{Depression}', '504 Plan', 'Private Pay', 'Thu 5:00-6:00 PM (starts Apr 16 recurring)', tutor_id)
  returning id into sid;

  insert into public.student_guardians (student_id, guardian_name, phone, is_primary)
  values (sid, 'Brianne Crouse', '419-290-6723', true);

  insert into public.student_guardians (student_id, guardian_name, phone, email, is_primary, notes)
  values (sid, 'Danny Crouse', '419-902-0895', 'djc1837@yahoo.com', false, 'Secondary contact (father)');

  -- ─── 6. Mason Rosario ───
  insert into public.students (first_name, last_name, grade_band, primary_subjects, session_type, diagnoses, accommodation_plan, payer, recurring_schedule, created_by_profile_id)
  values ('Mason', 'Rosario', '8th', '{Math,Reading}', 'online', '{ASD,ADHD}', 'IEP', 'WellCare CMS FL', 'Mon 5-6 PM + Wed 6:30-7:30 PM recurring; Fri Apr 17 6:30-7:30 PM one-time', tutor_id)
  returning id into sid;

  insert into public.student_guardians (student_id, guardian_name, phone, is_primary)
  values (sid, 'Edwardo Rosario', '347-821-0164', true);

  -- ─── 7. Jordynn Griffith ───
  insert into public.students (first_name, last_name, grade_band, primary_subjects, session_type, session_location, diagnoses, accommodation_plan, payer, recurring_schedule, emotional_regulation_notes, status, created_by_profile_id)
  values ('Jordynn', 'Griffith', '4th', '{Reading,Writing}', 'hybrid', 'Alafaya Library, Orlando FL', '{ADHD,Anxiety,Depression,PTSD}', 'IEP', 'Aetna OhioRISE', 'TBD (thread gone cold since Feb 2026)', 'Thread gone cold since Feb 2026; follow up needed', 'invited', tutor_id)
  returning id into sid;

  insert into public.student_guardians (student_id, guardian_name, email, is_primary)
  values (sid, 'Sara Barclay', 'sarabarclay34@gmail.com', true);

  -- ─── 8. Cassandra Lukasiewicz (DISCHARGED) ───
  insert into public.students (first_name, last_name, grade_band, primary_subjects, session_type, session_location, diagnoses, accommodation_plan, payer, recurring_schedule, status, created_by_profile_id)
  values ('Cassandra', 'Lukasiewicz', '8th', '{Math,Reading}', 'hybrid', 'Alafaya Library, Orlando FL', '{ADHD,ODD,Anxiety,Mood Disorders}', '504 Plan', 'Aetna OhioRISE', 'DISCHARGED Apr 9, 2026', 'archived', tutor_id)
  returning id into sid;

  insert into public.student_guardians (student_id, guardian_name, phone, is_primary)
  values (sid, 'Tonya', '440-898-4158', true);

end
$$;

-- Student access foundation for Jalanea Tutor Platform
-- This migration extends the live Jalanea.dev Supabase project, which already
-- contains public.profiles(id, email, full_name, avatar_url, created_at, updated_at).
--
-- Goals:
-- 1. Keep tutor/admin auth in Supabase Auth.
-- 2. Keep student identities as application records, not auth users.
-- 3. Support searchable student access lookup from the tutor dashboard.
-- 4. Support starter-code + PIN flows without storing raw long-term PIN values.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists citext;
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'tutor', 'caregiver');
  end if;

  if not exists (select 1 from pg_type where typname = 'student_access_status') then
    create type public.student_access_status as enum ('invited', 'active', 'locked', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'delivery_method') then
    create type public.delivery_method as enum ('email', 'sms', 'print', 'manual');
  end if;

  if not exists (select 1 from pg_type where typname = 'access_code_purpose') then
    create type public.access_code_purpose as enum ('starter', 'pin_reset', 'caregiver_recovery');
  end if;
end
$$;
alter table public.profiles
  add column if not exists role public.app_role not null default 'tutor';
do $$
begin
  if (select count(*) from public.profiles) = 1 then
    update public.profiles
    set role = 'admin'
    where role <> 'admin';
  end if;
end
$$;
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  external_student_id text unique,
  first_name text not null,
  last_name text,
  display_name text generated always as (btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) stored,
  grade_band text,
  primary_subjects text[] not null default '{}',
  device_type text,
  attention_notes text,
  sensory_load_notes text,
  emotional_regulation_notes text,
  status public.student_access_status not null default 'invited',
  created_by_profile_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  guardian_name text not null,
  relationship_to_student text,
  email citext,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.tutor_student_assignments (
  id uuid primary key default gen_random_uuid(),
  tutor_profile_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tutor_profile_id, student_id)
);
create table if not exists public.student_portal_credentials (
  student_id uuid primary key references public.students(id) on delete cascade,
  pin_hash text not null,
  pin_set_at timestamptz,
  last_login_at timestamptz,
  failed_attempt_count integer not null default 0,
  locked_until timestamptz,
  current_access_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.student_access_codes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  purpose public.access_code_purpose not null,
  delivery_method public.delivery_method not null default 'manual',
  code_hash text not null,
  code_label text,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_by_profile_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.student_access_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  event_type text not null,
  event_detail jsonb not null default '{}'::jsonb,
  actor_profile_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists students_display_name_trgm_idx
  on public.students using gin (display_name gin_trgm_ops);
create index if not exists students_external_student_id_idx
  on public.students (external_student_id);
create index if not exists student_guardians_student_id_idx
  on public.student_guardians (student_id);
create index if not exists tutor_student_assignments_student_id_idx
  on public.tutor_student_assignments (student_id);
create index if not exists student_access_codes_student_id_idx
  on public.student_access_codes (student_id);
create index if not exists student_access_codes_active_lookup_idx
  on public.student_access_codes (student_id, expires_at desc)
  where revoked_at is null and used_at is null;
create index if not exists student_access_events_student_id_idx
  on public.student_access_events (student_id, created_at desc);
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();
drop trigger if exists student_portal_credentials_set_updated_at on public.student_portal_credentials;
create trigger student_portal_credentials_set_updated_at
before update on public.student_portal_credentials
for each row execute function public.set_updated_at();
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;
create or replace function public.is_assigned_tutor(target_student_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.tutor_student_assignments tsa
    where tsa.student_id = target_student_id
      and tsa.tutor_profile_id = auth.uid()
  );
$$;
create or replace function public.can_manage_student(target_student_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.students s
    where s.id = target_student_id
      and (
        public.is_admin()
        or s.created_by_profile_id = auth.uid()
        or public.is_assigned_tutor(s.id)
      )
  );
$$;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.student_guardians enable row level security;
alter table public.tutor_student_assignments enable row level security;
alter table public.student_portal_credentials enable row level security;
alter table public.student_access_codes enable row level security;
alter table public.student_access_events enable row level security;
drop policy if exists "profiles_admin_read" on public.profiles;
create policy "profiles_admin_read"
on public.profiles
for select
using (public.is_admin());
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
on public.profiles
for update
using (public.is_admin())
with check (public.is_admin());
drop policy if exists "students_assigned_tutors_read" on public.students;
create policy "students_assigned_tutors_read"
on public.students
for select
using (public.can_manage_student(id));
drop policy if exists "students_assigned_tutors_write" on public.students;
create policy "students_assigned_tutors_write"
on public.students
for all
using (public.can_manage_student(id))
with check (
  public.is_admin()
  or created_by_profile_id = auth.uid()
  or public.is_assigned_tutor(id)
);
drop policy if exists "students_tutors_insert" on public.students;
create policy "students_tutors_insert"
on public.students
for insert
with check (
  public.is_admin()
  or created_by_profile_id = auth.uid()
);
drop policy if exists "student_guardians_assigned_tutors" on public.student_guardians;
create policy "student_guardians_assigned_tutors"
on public.student_guardians
for all
using (public.can_manage_student(student_id))
with check (public.can_manage_student(student_id));
drop policy if exists "assignments_tutor_read" on public.tutor_student_assignments;
create policy "assignments_tutor_read"
on public.tutor_student_assignments
for select
using (
  public.is_admin()
  or tutor_profile_id = auth.uid()
);
drop policy if exists "assignments_admin_write" on public.tutor_student_assignments;
create policy "assignments_admin_write"
on public.tutor_student_assignments
for all
using (public.is_admin() or tutor_profile_id = auth.uid())
with check (public.is_admin() or tutor_profile_id = auth.uid());
drop policy if exists "credentials_assigned_tutors" on public.student_portal_credentials;
create policy "credentials_assigned_tutors"
on public.student_portal_credentials
for all
using (public.can_manage_student(student_id))
with check (public.can_manage_student(student_id));
drop policy if exists "access_codes_assigned_tutors" on public.student_access_codes;
create policy "access_codes_assigned_tutors"
on public.student_access_codes
for all
using (public.can_manage_student(student_id))
with check (public.can_manage_student(student_id));
drop policy if exists "access_events_assigned_tutors" on public.student_access_events;
create policy "access_events_assigned_tutors"
on public.student_access_events
for select
using (public.can_manage_student(student_id));
comment on table public.students is
'Student roster records. Search by display_name from the tutor dashboard.';
comment on table public.student_portal_credentials is
'Stores hashed student PIN state and lock metadata. Do not store raw PIN values here.';
comment on table public.student_access_codes is
'Stores hashed starter/reset codes. Generate a new code whenever a student needs access help.';

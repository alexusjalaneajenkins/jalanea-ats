-- Student portal auth/session helpers for route-specific student flows.

create table if not exists public.student_portal_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  access_version integer not null,
  session_hash text not null,
  device_context jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists student_portal_sessions_student_id_idx
  on public.student_portal_sessions (student_id, expires_at desc);
create index if not exists student_portal_sessions_active_idx
  on public.student_portal_sessions (student_id, revoked_at, expires_at desc);
alter table public.student_portal_sessions enable row level security;
drop policy if exists "sessions_assigned_tutors_read" on public.student_portal_sessions;
create policy "sessions_assigned_tutors_read"
on public.student_portal_sessions
for select
using (public.can_manage_student(student_id));
create or replace function public.resolve_student_reference(student_ref text)
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  cleaned text := nullif(btrim(student_ref), '');
  resolved uuid;
begin
  if cleaned is null then
    return null;
  end if;

  select s.id
  into resolved
  from public.students s
  where lower(coalesce(s.external_student_id, '')) = lower(cleaned)
  limit 1;

  if resolved is not null then
    return resolved;
  end if;

  begin
    resolved := cleaned::uuid;
  exception
    when invalid_text_representation then
      resolved := null;
  end;

  return resolved;
end;
$$;
create or replace function public.hash_portal_secret(secret_value text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(coalesce(secret_value, ''), 'sha256'), 'hex');
$$;
create or replace function public.issue_student_portal_session(
  target_student_id uuid,
  client_device_type text default null
)
returns table (
  session_token text,
  session_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_token text := encode(extensions.gen_random_bytes(24), 'hex');
  current_version integer := 1;
  expiry timestamptz := now() + interval '14 days';
begin
  select c.current_access_version
  into current_version
  from public.student_portal_credentials c
  where c.student_id = target_student_id;

  current_version := coalesce(current_version, 1);

  insert into public.student_portal_sessions (
    student_id,
    access_version,
    session_hash,
    device_context,
    expires_at,
    last_seen_at
  )
  values (
    target_student_id,
    current_version,
    public.hash_portal_secret(raw_token),
    jsonb_build_object('device_type', client_device_type),
    expiry,
    now()
  );

  return query
  select raw_token, expiry;
end;
$$;
create or replace function public.student_portal_bootstrap(student_ref text)
returns table (
  student_id uuid,
  external_student_id text,
  first_name text,
  display_name text,
  grade_band text,
  primary_subjects text[],
  device_type text,
  status text,
  has_pin boolean
)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    s.external_student_id,
    s.first_name,
    s.display_name,
    s.grade_band,
    s.primary_subjects,
    s.device_type,
    s.status::text,
    c.pin_set_at is not null as has_pin
  from public.students s
  left join public.student_portal_credentials c
    on c.student_id = s.id
  where s.id = public.resolve_student_reference(student_ref)
    and s.status <> 'archived'
  limit 1;
$$;
create or replace function public.student_portal_sign_in(
  student_ref text,
  pin text,
  client_device_type text default null
)
returns table (
  ok boolean,
  error_code text,
  session_token text,
  session_expires_at timestamptz,
  student_id uuid,
  external_student_id text,
  display_name text,
  grade_band text,
  primary_subjects text[],
  device_type text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_student_id uuid;
  student_row public.students%rowtype;
  creds public.student_portal_credentials%rowtype;
  issued record;
  next_failed_count integer;
begin
  target_student_id := public.resolve_student_reference(student_ref);

  if target_student_id is null then
    return query
    select false, 'student_not_found', null::text, null::timestamptz, null::uuid, null::text, null::text, null::text, null::text[], null::text;
    return;
  end if;

  select *
  into student_row
  from public.students
  where id = target_student_id;

  if not found or student_row.status = 'archived' then
    return query
    select false, 'student_not_found', null::text, null::timestamptz, null::uuid, null::text, null::text, null::text, null::text[], null::text;
    return;
  end if;

  select *
  into creds
  from public.student_portal_credentials c
  where c.student_id = target_student_id;

  if not found or creds.pin_hash is null then
    return query
    select false, 'pin_not_set', null::text, null::timestamptz, student_row.id, student_row.external_student_id, student_row.display_name, student_row.grade_band, student_row.primary_subjects, student_row.device_type;
    return;
  end if;

  if creds.locked_until is not null and creds.locked_until > now() then
    return query
    select false, 'temporarily_locked', null::text, null::timestamptz, student_row.id, student_row.external_student_id, student_row.display_name, student_row.grade_band, student_row.primary_subjects, student_row.device_type;
    return;
  end if;

  if extensions.crypt(pin, creds.pin_hash) <> creds.pin_hash then
    next_failed_count := coalesce(creds.failed_attempt_count, 0) + 1;

    update public.student_portal_credentials as c
    set failed_attempt_count = next_failed_count,
        locked_until = case
          when next_failed_count >= 5 then now() + interval '15 minutes'
          else null
        end
    where c.student_id = target_student_id;

    insert into public.student_access_events (
      student_id,
      event_type,
      event_detail
    )
    values (
      target_student_id,
      'student_login_failed',
      jsonb_build_object(
        'failed_attempt_count', next_failed_count,
        'device_type', client_device_type
      )
    );

    return query
    select
      false,
      case when next_failed_count >= 5 then 'temporarily_locked' else 'invalid_pin' end,
      null::text,
      null::timestamptz,
      student_row.id,
      student_row.external_student_id,
      student_row.display_name,
      student_row.grade_band,
      student_row.primary_subjects,
      student_row.device_type;
    return;
  end if;

  update public.student_portal_credentials as c
  set last_login_at = now(),
      failed_attempt_count = 0,
      locked_until = null
  where c.student_id = target_student_id;

  select *
  into issued
  from public.issue_student_portal_session(target_student_id, client_device_type);

  insert into public.student_access_events (
    student_id,
    event_type,
    event_detail
  )
  values (
    target_student_id,
    'student_login_success',
    jsonb_build_object('device_type', client_device_type)
  );

  return query
  select
    true,
    null::text,
    issued.session_token,
    issued.session_expires_at,
    student_row.id,
    student_row.external_student_id,
    student_row.display_name,
    student_row.grade_band,
    student_row.primary_subjects,
    coalesce(client_device_type, student_row.device_type);
end;
$$;
create or replace function public.student_portal_set_pin(
  student_ref text,
  access_code text,
  new_pin text,
  client_device_type text default null
)
returns table (
  ok boolean,
  error_code text,
  session_token text,
  session_expires_at timestamptz,
  student_id uuid,
  external_student_id text,
  display_name text,
  grade_band text,
  primary_subjects text[],
  device_type text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_student_id uuid;
  student_row public.students%rowtype;
  creds public.student_portal_credentials%rowtype;
  matched_code public.student_access_codes%rowtype;
  next_access_version integer := 1;
  issued record;
begin
  target_student_id := public.resolve_student_reference(student_ref);

  if target_student_id is null then
    return query
    select false, 'student_not_found', null::text, null::timestamptz, null::uuid, null::text, null::text, null::text, null::text[], null::text;
    return;
  end if;

  if coalesce(new_pin, '') !~ '^[0-9]{4}$' then
    return query
    select false, 'invalid_pin_format', null::text, null::timestamptz, null::uuid, null::text, null::text, null::text, null::text[], null::text;
    return;
  end if;

  select *
  into student_row
  from public.students
  where id = target_student_id;

  if not found or student_row.status = 'archived' then
    return query
    select false, 'student_not_found', null::text, null::timestamptz, null::uuid, null::text, null::text, null::text, null::text[], null::text;
    return;
  end if;

  select sac.*
  into matched_code
  from public.student_access_codes sac
  where sac.student_id = target_student_id
    and sac.revoked_at is null
    and sac.used_at is null
    and sac.expires_at > now()
    and extensions.crypt(access_code, sac.code_hash) = sac.code_hash
  order by sac.created_at desc
  limit 1;

  if not found then
    return query
    select false, 'invalid_access_code', null::text, null::timestamptz, student_row.id, student_row.external_student_id, student_row.display_name, student_row.grade_band, student_row.primary_subjects, student_row.device_type;
    return;
  end if;

  select *
  into creds
  from public.student_portal_credentials c
  where c.student_id = target_student_id;

  next_access_version := coalesce(creds.current_access_version, 0) + 1;

  insert into public.student_portal_credentials (
    student_id,
    pin_hash,
    pin_set_at,
    last_login_at,
    failed_attempt_count,
    locked_until,
    current_access_version
  )
  values (
    target_student_id,
    extensions.crypt(new_pin, extensions.gen_salt('bf')),
    now(),
    now(),
    0,
    null,
    greatest(next_access_version, 1)
  )
  on conflict on constraint student_portal_credentials_pkey do update
    set pin_hash = excluded.pin_hash,
        pin_set_at = excluded.pin_set_at,
        last_login_at = excluded.last_login_at,
        failed_attempt_count = 0,
        locked_until = null,
        current_access_version = excluded.current_access_version,
        updated_at = now();

  update public.students as s
  set status = 'active',
      device_type = coalesce(client_device_type, s.device_type),
      updated_at = now()
  where s.id = target_student_id;

  update public.student_access_codes
  set used_at = now()
  where id = matched_code.id;

  update public.student_portal_sessions as sps
  set revoked_at = now()
  where sps.student_id = target_student_id
    and sps.revoked_at is null;

  insert into public.student_access_events (
    student_id,
    event_type,
    event_detail
  )
  values (
    target_student_id,
    'student_pin_set',
    jsonb_build_object(
      'purpose', matched_code.purpose,
      'device_type', client_device_type
    )
  );

  select *
  into issued
  from public.issue_student_portal_session(target_student_id, client_device_type);

  return query
  select
    true,
    null::text,
    issued.session_token,
    issued.session_expires_at,
    student_row.id,
    student_row.external_student_id,
    student_row.display_name,
    student_row.grade_band,
    student_row.primary_subjects,
    coalesce(client_device_type, student_row.device_type);
end;
$$;
create or replace function public.get_student_portal_session(
  student_ref text,
  session_token text
)
returns table (
  ok boolean,
  student_id uuid,
  external_student_id text,
  first_name text,
  display_name text,
  grade_band text,
  primary_subjects text[],
  device_type text,
  last_login_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_student_id uuid;
  session_row public.student_portal_sessions%rowtype;
  creds public.student_portal_credentials%rowtype;
  student_row public.students%rowtype;
begin
  target_student_id := public.resolve_student_reference(student_ref);

  if target_student_id is null then
    return;
  end if;

  select *
  into session_row
  from public.student_portal_sessions sps
  where sps.student_id = target_student_id
    and sps.session_hash = public.hash_portal_secret(session_token)
    and sps.revoked_at is null
    and sps.expires_at > now()
  order by sps.created_at desc
  limit 1;

  if not found then
    return;
  end if;

  select *
  into creds
  from public.student_portal_credentials c
  where c.student_id = target_student_id;

  if not found or creds.current_access_version <> session_row.access_version then
    return;
  end if;

  select *
  into student_row
  from public.students
  where id = target_student_id
    and status <> 'archived';

  if not found then
    return;
  end if;

  update public.student_portal_sessions
  set last_seen_at = now()
  where id = session_row.id;

  return query
  select
    true,
    student_row.id,
    student_row.external_student_id,
    student_row.first_name,
    student_row.display_name,
    student_row.grade_band,
    student_row.primary_subjects,
    student_row.device_type,
    creds.last_login_at;
end;
$$;
create or replace function public.student_portal_sign_out(
  student_ref text,
  session_token text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_student_id uuid := public.resolve_student_reference(student_ref);
begin
  if target_student_id is null then
    return false;
  end if;

  update public.student_portal_sessions as sps
  set revoked_at = now()
  where sps.student_id = target_student_id
    and sps.session_hash = public.hash_portal_secret(session_token)
    and sps.revoked_at is null;

  return found;
end;
$$;
create or replace function public.request_student_recovery_help(student_ref text)
returns table (
  ok boolean,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_student_id uuid := public.resolve_student_reference(student_ref);
begin
  if target_student_id is null then
    return query select false, 'We could not find that student.';
    return;
  end if;

  insert into public.student_access_events (
    student_id,
    event_type,
    event_detail
  )
  values (
    target_student_id,
    'student_recovery_requested',
    jsonb_build_object('requested_at', now())
  );

  return query select true, 'Your tutor can now create a fresh reset code for you.';
end;
$$;
revoke all on function public.resolve_student_reference(text) from public;
revoke all on function public.issue_student_portal_session(uuid, text) from public;
grant execute on function public.student_portal_bootstrap(text) to anon, authenticated;
grant execute on function public.student_portal_sign_in(text, text, text) to anon, authenticated;
grant execute on function public.student_portal_set_pin(text, text, text, text) to anon, authenticated;
grant execute on function public.get_student_portal_session(text, text) to anon, authenticated;
grant execute on function public.student_portal_sign_out(text, text) to anon, authenticated;
grant execute on function public.request_student_recovery_help(text) to anon, authenticated;

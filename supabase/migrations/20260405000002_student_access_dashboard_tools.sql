-- Tutor dashboard helpers for searching student access records
-- and generating one-time starter/reset codes.

create or replace view public.student_access_directory
with (security_invoker = true)
as
select
  s.id as student_id,
  s.external_student_id,
  s.first_name,
  s.last_name,
  s.display_name,
  s.grade_band,
  s.primary_subjects,
  s.device_type,
  s.status,
  s.created_at,
  s.updated_at,
  c.pin_set_at,
  c.last_login_at,
  c.failed_attempt_count,
  c.locked_until,
  c.current_access_version,
  g.guardian_name as primary_guardian_name,
  g.relationship_to_student as primary_guardian_relationship,
  g.email as primary_guardian_email,
  g.phone as primary_guardian_phone,
  a.id as latest_active_code_id,
  a.purpose as latest_active_code_purpose,
  a.delivery_method as latest_active_code_delivery_method,
  a.code_label as latest_active_code_label,
  a.created_at as latest_active_code_created_at,
  a.expires_at as latest_active_code_expires_at
from public.students s
left join public.student_portal_credentials c
  on c.student_id = s.id
left join lateral (
  select
    sg.guardian_name,
    sg.relationship_to_student,
    sg.email,
    sg.phone
  from public.student_guardians sg
  where sg.student_id = s.id
  order by sg.is_primary desc, sg.created_at asc
  limit 1
) g on true
left join lateral (
  select
    sac.id,
    sac.purpose,
    sac.delivery_method,
    sac.code_label,
    sac.created_at,
    sac.expires_at
  from public.student_access_codes sac
  where sac.student_id = s.id
    and sac.revoked_at is null
    and sac.used_at is null
    and sac.expires_at > now()
  order by sac.created_at desc
  limit 1
) a on true;
revoke all on public.student_access_directory from public;
grant select on public.student_access_directory to authenticated;
grant select on public.profiles to authenticated;
grant select on public.students to authenticated;
grant select on public.student_guardians to authenticated;
grant select on public.student_portal_credentials to authenticated;
grant select on public.student_access_codes to authenticated;
grant select on public.student_access_events to authenticated;
grant select on public.tutor_student_assignments to authenticated;
create or replace function public.generate_student_access_code(
  target_student_id uuid,
  code_purpose public.access_code_purpose default 'pin_reset',
  delivery public.delivery_method default 'manual',
  minutes_valid integer default 60
)
returns table (
  code_id uuid,
  plain_code text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  requester uuid := auth.uid();
  raw_code text;
  normalized_token text;
  new_code_id uuid;
  new_expires_at timestamptz;
begin
  if requester is null then
    raise exception 'Authentication required';
  end if;

  if minutes_valid < 5 or minutes_valid > 10080 then
    raise exception 'minutes_valid must be between 5 and 10080';
  end if;

  if not public.can_manage_student(target_student_id) then
    raise exception 'You are not allowed to generate access for this student';
  end if;

  update public.student_access_codes
  set revoked_at = now()
  where student_id = target_student_id
    and purpose = code_purpose
    and revoked_at is null
    and used_at is null;

  normalized_token := upper(encode(extensions.gen_random_bytes(4), 'hex'));
  raw_code := concat(substr(normalized_token, 1, 4), '-', substr(normalized_token, 5, 4));
  new_expires_at := now() + make_interval(mins => minutes_valid);

  insert into public.student_access_codes (
    student_id,
    purpose,
    delivery_method,
    code_hash,
    code_label,
    expires_at,
    created_by_profile_id
  )
  values (
    target_student_id,
    code_purpose,
    delivery,
    extensions.crypt(raw_code, extensions.gen_salt('bf')),
    concat(upper(code_purpose::text), ' ', to_char(now(), 'YYYY-MM-DD HH24:MI')),
    new_expires_at,
    requester
  )
  returning id into new_code_id;

  insert into public.student_access_events (
    student_id,
    event_type,
    event_detail,
    actor_profile_id
  )
  values (
    target_student_id,
    'access_code_generated',
    jsonb_build_object(
      'purpose', code_purpose,
      'delivery_method', delivery,
      'expires_at', new_expires_at
    ),
    requester
  );

  return query
  select new_code_id, raw_code, new_expires_at;
end;
$$;
revoke all on function public.generate_student_access_code(uuid, public.access_code_purpose, public.delivery_method, integer) from public;
grant execute on function public.generate_student_access_code(uuid, public.access_code_purpose, public.delivery_method, integer) to authenticated;
create or replace function public.get_student_access_record(student_ref text)
returns setof public.student_access_directory
language sql
security definer
set search_path = public
as $$
  select sad.*
  from public.student_access_directory sad
  where auth.uid() is not null
    and public.can_manage_student(sad.student_id)
    and (
      sad.student_id::text = btrim(student_ref)
      or lower(coalesce(sad.external_student_id, '')) = lower(btrim(student_ref))
    )
  limit 1;
$$;
revoke all on function public.get_student_access_record(text) from public;
grant execute on function public.get_student_access_record(text) to authenticated;

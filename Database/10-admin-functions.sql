create or replace function public.admin_all_users()
returns table (id uuid, full_name text, email text, batch text, graduation_year int,
               enrollment_no text, role text, is_verified boolean, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
    select p.id, p.full_name, u.email::text, p.batch, p.graduation_year,
           p.enrollment_no, p.role, p.is_verified, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

create or replace function public.admin_reports()
returns table (id uuid, reason text, status text, created_at timestamptz,
               reporter_name text, target_type text, target_id uuid,
               target_name text, target_company text)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
    select r.id, r.reason, r.status, r.created_at,
           rp.full_name,
           case when r.target_profile_id is not null then 'profile' else 'job' end,
           coalesce(r.target_profile_id, r.target_job_id),
           coalesce(tp.full_name, j.title),
           j.company
    from public.reports r
    join public.profiles rp on rp.id = r.reporter_id
    left join public.profiles tp on tp.id = r.target_profile_id
    left join public.jobs j on j.id = r.target_job_id
    order by (r.status = 'open') desc, r.created_at desc;
end;
$$;

create or replace function public.admin_set_report_status(report uuid, new_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if new_status not in ('open', 'resolved', 'dismissed') then
    raise exception 'Invalid status';
  end if;
  update public.reports set status = new_status where id = report;
end;
$$;

revoke execute on function public.admin_all_users() from public, anon;
revoke execute on function public.admin_reports() from public, anon;
revoke execute on function public.admin_set_report_status(uuid, text) from public, anon;
grant execute on function public.admin_all_users() to authenticated;
grant execute on function public.admin_reports() to authenticated;
grant execute on function public.admin_set_report_status(uuid, text) to authenticated;
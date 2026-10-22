create or replace function public.admin_pending_users()
returns table (id uuid, full_name text, email text, batch text,
               graduation_year int, enrollment_no text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
    select p.id, p.full_name, u.email::text, p.batch, p.graduation_year,
           p.enrollment_no, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.is_verified = false and u.email_confirmed_at is not null
    order by p.created_at;
end;
$$;
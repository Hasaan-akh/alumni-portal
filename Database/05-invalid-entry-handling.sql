-- 1. VERIFICATION AUDIT COLUMNS
alter table public.profiles
  add column verified_at timestamptz,
  add column verified_by uuid references public.profiles(id) on delete set null;

-- 2. DATA QUALITY RULES
alter table public.profiles
  add constraint profiles_name_len check (char_length(full_name) between 2 and 100),
  add constraint profiles_bio_len check (bio is null or char_length(bio) <= 1000),
  add constraint profiles_year_range check (graduation_year is null or graduation_year between 1950 and 2100);

alter table public.jobs
  add constraint jobs_title_len check (char_length(title) between 3 and 150),
  add constraint jobs_company_len check (char_length(company) between 2 and 150),
  add constraint jobs_desc_len check (description is null or char_length(description) <= 3000);

-- 3. INDEXES FOR SEARCH
create index profiles_batch_idx on public.profiles (batch);
create index profiles_year_idx on public.profiles (graduation_year);
create index profiles_verified_idx on public.profiles (is_verified);
create index jobs_created_idx on public.jobs (created_at desc);
create index jobs_posted_by_idx on public.jobs (posted_by);

-- 4. HIDE PRIVATE COLUMNS, LIMIT WHAT USERS CAN EDIT
revoke all on public.profiles from anon;
revoke all on public.jobs from anon;
revoke select, insert, update, delete on public.profiles from authenticated;

grant select (id, full_name, batch, graduation_year, job_title, company, skills, bio,
              linkedin, github, profile_picture, role, is_verified, verified_at, created_at)
  on public.profiles to authenticated;

grant update (full_name, batch, graduation_year, job_title, company, skills, bio,
              linkedin, github, profile_picture)
  on public.profiles to authenticated;

-- 5. ADMIN FUNCTIONS
drop policy if exists "Admin can delete profiles" on public.profiles;

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
    where p.is_verified = false
    order by p.created_at;
end;
$$;

create or replace function public.admin_verify_user(target uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.profiles
  set is_verified = true, verified_at = now(), verified_by = auth.uid()
  where id = target;
end;
$$;

create or replace function public.admin_remove_user(target uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if exists (select 1 from public.profiles where id = target and role = 'admin') then
    raise exception 'Admin accounts cannot be removed here';
  end if;
  delete from auth.users where id = target;
end;
$$;

revoke execute on function public.admin_pending_users() from public, anon;
revoke execute on function public.admin_verify_user(uuid) from public, anon;
revoke execute on function public.admin_remove_user(uuid) from public, anon;
grant execute on function public.admin_pending_users() to authenticated;
grant execute on function public.admin_verify_user(uuid) to authenticated;
grant execute on function public.admin_remove_user(uuid) to authenticated;

-- 6. REPORTS TABLE
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_profile_id uuid references public.profiles(id) on delete cascade,
  target_job_id uuid references public.jobs(id) on delete cascade,
  reason text not null check (char_length(reason) between 5 and 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  check (((target_profile_id is not null)::int + (target_job_id is not null)::int) = 1)
);

create unique index reports_unique_profile on public.reports (reporter_id, target_profile_id)
  where target_profile_id is not null;
create unique index reports_unique_job on public.reports (reporter_id, target_job_id)
  where target_job_id is not null;

alter table public.reports enable row level security;
revoke all on public.reports from anon;
revoke update on public.reports from authenticated;
grant update (status) on public.reports to authenticated;

create policy "Verified users can report"
  on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_verified_user());

create policy "Reporter or admin can view reports"
  on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy "Admin can update reports"
  on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Admin can delete reports"
  on public.reports for delete to authenticated
  using (public.is_admin());

-- 7. PROFILE PICTURE STORAGE
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Users read own avatar files"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users upload own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users update own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
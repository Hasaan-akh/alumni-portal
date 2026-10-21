-- HELPER FUNCTIONS
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_verified_user()
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_verified = true);
$$;

-- AUTO-CREATE PROFILE WHEN SOMEONE SIGNS UP
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, batch, graduation_year)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'batch',
    nullif(new.raw_user_meta_data->>'graduation_year', '')::int
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- STOP NORMAL USERS FROM MAKING THEMSELVES ADMIN OR VERIFIED
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.is_verified is distinct from old.is_verified then
      raise exception 'Not allowed to change role or verification status';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- TURN ON ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;

-- PROFILES RULES
create policy "View verified profiles, own profile, or all if admin"
  on public.profiles for select to authenticated
  using (is_verified = true or id = auth.uid() or public.is_admin());

create policy "Update own profile or any if admin"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "Admin can delete profiles"
  on public.profiles for delete to authenticated
  using (public.is_admin());

-- JOBS RULES
create policy "Verified users and admin can view jobs"
  on public.jobs for select to authenticated
  using (public.is_verified_user() or public.is_admin());

create policy "Verified users can post jobs"
  on public.jobs for insert to authenticated
  with check (posted_by = auth.uid() and public.is_verified_user());

create policy "Owner or admin can edit jobs"
  on public.jobs for update to authenticated
  using (posted_by = auth.uid() or public.is_admin());

create policy "Owner or admin can delete jobs"
  on public.jobs for delete to authenticated
  using (posted_by = auth.uid() or public.is_admin());
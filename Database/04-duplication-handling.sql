-- 1. Normalise emails (strips +tags, and dots for Gmail)
create or replace function public.normalize_email(e text)
returns text language plpgsql immutable set search_path = '' as $$
declare lp text; dp text;
begin
  e := lower(trim(e));
  lp := split_part(split_part(e, '@', 1), '+', 1);
  dp := split_part(e, '@', 2);
  if dp in ('gmail.com', 'googlemail.com') then
    lp := replace(lp, '.', '');
    dp := 'gmail.com';
  end if;
  return lp || '@' || dp;
end;
$$;

-- 2. New columns with uniqueness
alter table public.profiles
  add column enrollment_no text,
  add column normalized_email text;

create unique index profiles_enrollment_no_key
  on public.profiles (upper(trim(enrollment_no))) where enrollment_no is not null;
create unique index profiles_normalized_email_key
  on public.profiles (normalized_email) where normalized_email is not null;

-- fill in your existing admin row
update public.profiles p
set normalized_email = public.normalize_email(u.email)
from auth.users u where u.id = p.id;

-- 3. Signup trigger now saves both
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, batch, graduation_year, enrollment_no, normalized_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'batch',
    nullif(new.raw_user_meta_data->>'graduation_year', '')::int,
    nullif(trim(new.raw_user_meta_data->>'enrollment_no'), ''),
    public.normalize_email(new.email)
  );
  return new;
end;
$$;

-- 4. Keep normalized email in sync when a user changes their email
create or replace function public.sync_email_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles
  set normalized_email = public.normalize_email(new.email)
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.sync_email_change();

-- 5. Users must not edit these fields themselves
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if pg_trigger_depth() = 1 and auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.is_verified is distinct from old.is_verified
       or new.enrollment_no is distinct from old.enrollment_no
       or new.normalized_email is distinct from old.normalized_email then
      raise exception 'Not allowed to change this field';
    end if;
  end if;
  return new;
end;
$$;
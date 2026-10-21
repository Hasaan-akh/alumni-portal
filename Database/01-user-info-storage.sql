create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  batch text,
  graduation_year int,
  job_title text,
  company text,
  skills text,
  bio text,
  linkedin text,
  github text,
  profile_picture text,
  role text not null default 'alumni' check (role in ('alumni', 'admin')),
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  posted_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  company text not null,
  description text,
  skills text,
  contact text,
  created_at timestamptz not null default now()
);
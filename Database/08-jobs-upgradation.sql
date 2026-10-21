alter table public.jobs drop column if exists contact;

alter table public.jobs
  add column if not exists experience text,
  add column if not exists job_type text,
  add column if not exists location text,
  add column if not exists apply_email text,
  add column if not exists apply_link text,
  add column if not exists is_active boolean not null default true;

alter table public.jobs drop constraint if exists jobs_job_type_valid;
alter table public.jobs drop constraint if exists jobs_experience_len;
alter table public.jobs drop constraint if exists jobs_location_len;
alter table public.jobs drop constraint if exists jobs_apply_email_format;
alter table public.jobs drop constraint if exists jobs_apply_link_format;
alter table public.jobs drop constraint if exists jobs_apply_method;
alter table public.jobs drop constraint if exists jobs_experience_required;

alter table public.jobs
  add constraint jobs_job_type_valid
    check (job_type is null or job_type in ('full-time', 'part-time', 'internship', 'contract')),
  add constraint jobs_experience_len
    check (experience is null or char_length(experience) <= 100),
  add constraint jobs_location_len
    check (location is null or char_length(location) <= 100),
  add constraint jobs_apply_email_format
    check (apply_email is null or apply_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
  add constraint jobs_apply_link_format
    check (apply_link is null or apply_link ~* '^https?://');

alter table public.jobs
  add constraint jobs_apply_method
    check (apply_email is not null or apply_link is not null) not valid;

alter table public.jobs
  add constraint jobs_experience_required
    check (experience is not null and char_length(trim(experience)) > 0) not valid;

create index if not exists jobs_active_idx on public.jobs (is_active, created_at desc);

alter table public.jobs alter column posted_by set default auth.uid();
alter table public.reports alter column reporter_id set default auth.uid();
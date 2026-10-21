create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text := trim(coalesce(new.raw_user_meta_data->>'full_name', ''));
  v_batch text := trim(coalesce(new.raw_user_meta_data->>'batch', ''));
  v_year text := trim(coalesce(new.raw_user_meta_data->>'graduation_year', ''));
  v_enroll text := trim(coalesce(new.raw_user_meta_data->>'enrollment_no', ''));
begin
  if v_name = '' or v_batch = '' or v_year = '' or v_enroll = '' then
    raise exception 'Name, batch, graduation year and enrollment number are required';
  end if;

  insert into public.profiles (id, full_name, batch, graduation_year, enrollment_no, normalized_email)
  values (new.id, v_name, v_batch, v_year::int, v_enroll, public.normalize_email(new.email));

  return new;
end;
$$;
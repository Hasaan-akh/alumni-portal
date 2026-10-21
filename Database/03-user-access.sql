drop policy "View verified profiles, own profile, or all if admin" on public.profiles;
create policy "View own profile, verified profiles if verified, all if admin"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or (is_verified = true and public.is_verified_user())
  );
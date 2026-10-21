update public.profiles
set role = 'admin', is_verified = true, full_name = ''
where id = (select id from auth.users where email = '');
update auth.users
set encrypted_password = extensions.crypt('', extensions.gen_salt('bf'))
where email = '';
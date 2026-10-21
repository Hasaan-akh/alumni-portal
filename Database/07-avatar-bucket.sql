select
  (select count(*) from public.profiles where role = 'admin') as admins,
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'reports') as reports_table,
  (select count(*) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('admin_pending_users', 'admin_verify_user', 'admin_remove_user')) as admin_functions,
  (select count(*) from storage.buckets where id = 'avatars') as avatar_bucket;
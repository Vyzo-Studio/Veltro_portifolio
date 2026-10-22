do $pre$
begin
 if (select count(*) from public.admin_users where active)<>1 then
   raise exception 'A migração requer exatamente um administrador ativo; operação cancelada.';
 end if;
 if (select count(*) from public.admin_users a join auth.users u on lower(a.email)=lower(u.email)
     where a.active and u.deleted_at is null)<>1 then
   raise exception 'Administrador atual não identificado de forma única no Auth.';
 end if;
end $pre$;
alter table public.admin_users
  add column if not exists auth_user_id uuid references auth.users(id) on delete restrict;
create unique index if not exists gng_admin_users_auth_uid_unique
  on public.admin_users(auth_user_id) where auth_user_id is not null;
update public.admin_users a set auth_user_id=u.id
  from auth.users u
  where lower(a.email)=lower(u.email) and a.active and u.deleted_at is null
    and a.auth_user_id is distinct from u.id;
do $verify$
begin
 if exists(select 1 from public.admin_users where active and auth_user_id is null) then
   raise exception 'Migração não associou o administrador atual; abortando.';
 end if;
end $verify$;
create or replace function public.is_gng_admin()
returns boolean language sql stable security definer set search_path=''
as $fn$
  select auth.uid() is not null and exists(
    select 1 from public.admin_users a
    where a.auth_user_id=auth.uid() and a.active=true
  );
$fn$;
revoke all on function public.is_gng_admin() from public,anon,authenticated;
grant execute on function public.is_gng_admin() to authenticated;
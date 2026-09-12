-- Planilha Domestica
-- Harden RLS helpers, heartbeat access and advisor findings

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- Move SECURITY DEFINER helpers out of the exposed public API schema.
alter function public.can_access_sheet(uuid) set schema private;
alter function public.can_read_profile(uuid) set schema private;
alter function public.is_household_member(uuid) set schema private;
alter function public.is_household_owner(uuid) set schema private;

grant execute on function private.can_access_sheet(uuid) to authenticated, service_role;
grant execute on function private.can_read_profile(uuid) to authenticated, service_role;
grant execute on function private.is_household_member(uuid) to authenticated, service_role;
grant execute on function private.is_household_owner(uuid) to authenticated, service_role;
revoke execute on function private.can_access_sheet(uuid) from public, anon;
revoke execute on function private.can_read_profile(uuid) from public, anon;
revoke execute on function private.is_household_member(uuid) from public, anon;
revoke execute on function private.is_household_owner(uuid) from public, anon;

-- Trigger/event-trigger functions are internal and should not be exposed as RPCs.
alter function public.handle_new_user() set schema private;
alter function public.rls_auto_enable() set schema private;
revoke execute on function private.handle_new_user() from public, anon, authenticated;
revoke execute on function private.rls_auto_enable() from public, anon, authenticated;

-- Heartbeat remains callable with anon credentials, but no longer escalates via SECURITY DEFINER.
alter function public.keep_alive() security invoker;
alter function public.keepalive() security invoker;

create policy app_heartbeat_anon_select
on public.app_heartbeat for select to anon
using (id = 'supabase_keepalive');

create policy app_heartbeat_anon_insert
on public.app_heartbeat for insert to anon
with check (id = 'supabase_keepalive');

create policy app_heartbeat_anon_update
on public.app_heartbeat for update to anon
using (id = 'supabase_keepalive')
with check (id = 'supabase_keepalive');

create policy keepalive_pings_anon_select
on public.keepalive_pings for select to anon
using (id = 'supabase-free-keepalive');

create policy keepalive_pings_anon_insert
on public.keepalive_pings for insert to anon
with check (id = 'supabase-free-keepalive');

create policy keepalive_pings_anon_update
on public.keepalive_pings for update to anon
using (id = 'supabase-free-keepalive')
with check (id = 'supabase-free-keepalive');

-- Prevent auth.uid() from being re-evaluated once per row.
alter policy profiles_update_own on public.profiles
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

alter policy households_insert_self on public.households
with check (created_by = (select auth.uid()));

alter policy expense_rows_insert_member on public.expense_rows
with check (private.can_access_sheet(sheet_id) and created_by_user_id = (select auth.uid()));

alter policy expense_rows_update_member on public.expense_rows
using (private.can_access_sheet(sheet_id))
with check (private.can_access_sheet(sheet_id) and updated_by_user_id = (select auth.uid()));

-- Cover foreign keys flagged by the performance advisor.
create index if not exists expense_rows_created_by_user_id_idx
  on public.expense_rows(created_by_user_id);
create index if not exists expense_rows_updated_by_user_id_idx
  on public.expense_rows(updated_by_user_id);
create index if not exists households_created_by_idx
  on public.households(created_by);

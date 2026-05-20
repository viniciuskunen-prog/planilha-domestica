-- Planilha Domestica
-- Allow household members to read each other's profiles

create or replace function public.can_read_profile(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
  or exists (
    select 1
    from public.household_members current_member
    join public.household_members target_member
      on target_member.household_id = current_member.household_id
    where current_member.user_id = auth.uid()
      and target_member.user_id = target_user_id
  );
$$;

drop policy if exists "profiles_select_own" on public.profiles;

create policy "profiles_select_same_household"
on public.profiles for select
to authenticated
using (public.can_read_profile(id));

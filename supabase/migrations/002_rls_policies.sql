-- Planilha Domestica
-- RLS policy draft

-- Helper: true when current user is member of a household
create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
  );
$$;

-- Helper: true when current user is owner of a household
create or replace function public.is_household_owner(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  );
$$;

-- Helper: true when a sheet belongs to a household where current user is member
create or replace function public.can_access_sheet(target_sheet_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.monthly_sheets ms
    join public.household_members hm on hm.household_id = ms.household_id
    where ms.id = target_sheet_id
      and hm.user_id = auth.uid()
  );
$$;

-- PROFILES

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- HOUSEHOLDS

create policy "households_select_member"
on public.households for select
to authenticated
using (public.is_household_member(id));

create policy "households_insert_self"
on public.households for insert
to authenticated
with check (created_by = auth.uid());

create policy "households_update_owner"
on public.households for update
to authenticated
using (public.is_household_owner(id))
with check (public.is_household_owner(id));

-- HOUSEHOLD MEMBERS

create policy "household_members_select_member"
on public.household_members for select
to authenticated
using (public.is_household_member(household_id));

create policy "household_members_insert_owner"
on public.household_members for insert
to authenticated
with check (public.is_household_owner(household_id));

create policy "household_members_update_owner"
on public.household_members for update
to authenticated
using (public.is_household_owner(household_id))
with check (public.is_household_owner(household_id));

create policy "household_members_delete_owner"
on public.household_members for delete
to authenticated
using (public.is_household_owner(household_id));

-- MONTHLY SHEETS

create policy "monthly_sheets_select_member"
on public.monthly_sheets for select
to authenticated
using (public.is_household_member(household_id));

create policy "monthly_sheets_insert_member"
on public.monthly_sheets for insert
to authenticated
with check (public.is_household_member(household_id));

create policy "monthly_sheets_update_member"
on public.monthly_sheets for update
to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "monthly_sheets_delete_owner"
on public.monthly_sheets for delete
to authenticated
using (public.is_household_owner(household_id));

-- EXPENSE ROWS

create policy "expense_rows_select_member"
on public.expense_rows for select
to authenticated
using (public.can_access_sheet(sheet_id));

create policy "expense_rows_insert_member"
on public.expense_rows for insert
to authenticated
with check (
  public.can_access_sheet(sheet_id)
  and created_by_user_id = auth.uid()
);

create policy "expense_rows_update_member"
on public.expense_rows for update
to authenticated
using (public.can_access_sheet(sheet_id))
with check (
  public.can_access_sheet(sheet_id)
  and updated_by_user_id = auth.uid()
);

create policy "expense_rows_delete_member"
on public.expense_rows for delete
to authenticated
using (public.can_access_sheet(sheet_id));

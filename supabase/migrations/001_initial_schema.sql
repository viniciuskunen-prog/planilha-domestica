-- Planilha Domestica
-- Initial Supabase schema draft

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.household_role as enum ('owner', 'member');

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.household_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create table if not exists public.monthly_sheets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, year, month)
);

create table if not exists public.expense_rows (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.monthly_sheets(id) on delete cascade,
  description text not null default '',
  amount numeric(12,2) not null default 0 check (amount >= 0),
  paid_by_user_id uuid references public.profiles(id),
  position int not null default 0,
  created_by_user_id uuid not null references public.profiles(id),
  updated_by_user_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists household_members_household_id_idx on public.household_members (household_id);
create index if not exists household_members_user_id_idx on public.household_members (user_id);
create index if not exists monthly_sheets_household_period_idx on public.monthly_sheets (household_id, year, month);
create index if not exists expense_rows_sheet_position_idx on public.expense_rows (sheet_id, position);
create index if not exists expense_rows_paid_by_user_id_idx on public.expense_rows (paid_by_user_id);

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.monthly_sheets enable row level security;
alter table public.expense_rows enable row level security;

-- RLS policies will be added in 002_rls_policies.sql after validation.

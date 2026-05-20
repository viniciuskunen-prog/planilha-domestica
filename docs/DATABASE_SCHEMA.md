# Banco de dados

Stack recomendada: Supabase com PostgreSQL, Auth e Row Level Security.

## Entidades principais

### profiles

Perfil público mínimo do usuário autenticado.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### households

Espaço compartilhado da casa.

```sql
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### household_members

Define quem pode acessar cada espaço.

```sql
create type public.household_role as enum ('owner', 'member');

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.household_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);
```

### monthly_sheets

Folha mensal da casa.

```sql
create table public.monthly_sheets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, year, month)
);
```

### expense_rows

Cada linha livre da tabela mensal.

```sql
create table public.expense_rows (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.monthly_sheets(id) on delete cascade,
  description text not null default '',
  amount numeric(12,2) not null default 0,
  paid_by_user_id uuid references public.profiles(id),
  position int not null default 0,
  created_by_user_id uuid not null references public.profiles(id),
  updated_by_user_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## Observação sobre cálculo

No MVP, os totais não precisam ser salvos em tabela.

O frontend calcula a partir de `expense_rows`.

Isso evita inconsistência entre linha e resumo.

## Regra de acesso esperada

Um usuário só pode ler, criar, editar ou apagar dados de um household se existir vínculo em `household_members`.

A RLS precisa proteger:

- households;
- household_members;
- monthly_sheets;
- expense_rows.

## Políticas RLS em alto nível

### households

Usuário pode ler households dos quais é membro.
Usuário pode criar household.
Owner pode atualizar household.

### household_members

Usuário pode ler membros dos households dos quais participa.
Owner pode adicionar ou remover membros.
No MVP, os membros podem ser inseridos manualmente no Supabase se o convite ainda não existir.

### monthly_sheets

Usuário pode ler e editar folhas dos households dos quais participa.

### expense_rows

Usuário pode ler e editar linhas das folhas pertencentes aos households dos quais participa.

## Campos que podem entrar depois

Em `expense_rows`:

```sql
status text check (status in ('planned', 'paid')),
notes text,
due_date date,
paid_at date,
split_type text check (split_type in ('equal', 'custom', 'personal')),
```

Em outra tabela futura:

```sql
expense_row_splits
- id
- expense_row_id
- user_id
- amount
```

Isso permitiria divisão customizada por despesa.

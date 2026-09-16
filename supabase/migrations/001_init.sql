create extension if not exists pgcrypto;

create table if not exists public.training_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  category text,
  keywords text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.training_data enable row level security;

create policy "Users can read own training data"
on public.training_data for select to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own training data"
on public.training_data for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own training data"
on public.training_data for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own training data"
on public.training_data for delete to authenticated
using (auth.uid() = user_id);

create type public.app_role as enum ('admin', 'user');

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz default now(),
  unique(user_id, role)
);

alter table public.user_roles enable row level security;

create policy "Users can view own roles"
on public.user_roles for select to authenticated
using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- Assign admin roles manually in your own Supabase project after deployment.
-- Do not commit real user UUIDs or email addresses to this public repository.

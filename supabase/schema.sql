-- DNA Fragrances starter schema for Supabase PostgreSQL.
-- Run the complete file in Supabase Dashboard -> SQL Editor -> New query.
-- Every business record belongs to its authenticated user; RLS is enabled.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  fragrance text,
  size_ml integer not null default 50 check (size_ml >= 0),
  grade text,
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sale_date date not null default current_date,
  customer_name text,
  description text not null,
  quantity integer not null default 1 check (quantity > 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  status text not null default 'Nuuts',
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expense_date date not null default current_date,
  category text not null,
  description text,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.suppliers enable row level security;
alter table public.sales enable row level security;
alter table public.expenses enable row level security;

-- Policies restrict each authenticated user to records with their own user_id.
drop policy if exists "Users manage own products" on public.products;
create policy "Users manage own products" on public.products
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own suppliers" on public.suppliers;
create policy "Users manage own suppliers" on public.suppliers
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own sales" on public.sales;
create policy "Users manage own sales" on public.sales
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own expenses" on public.expenses;
create policy "Users manage own expenses" on public.expenses
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists products_user_created_idx on public.products(user_id, created_at desc);
create index if not exists suppliers_user_created_idx on public.suppliers(user_id, created_at desc);
create index if not exists sales_user_date_idx on public.sales(user_id, sale_date desc);
create index if not exists expenses_user_date_idx on public.expenses(user_id, expense_date desc);

-- TOEY Workspace Supabase schema v1.1 Admin Approval
-- Run this whole file in Supabase SQL Editor.
-- Safe to run again. It also fixes old tables that were missing user_id.

create extension if not exists pgcrypto;

-- =========================
-- Profiles / Approval
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text default '',
  role text not null default 'user' check (role in ('admin','user')),
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  created_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role, approval_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name',''),
    'user',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create missing profiles for existing auth users
insert into public.profiles (id, email, display_name, role, approval_status)
select id, email, '', 'user', 'pending'
from auth.users
on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and approval_status = 'approved'
  );
$$;

create or replace function public.is_approved_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and approval_status = 'approved'
  );
$$;

-- First admin setup: after signing up, call this once from Pending/Admin setup page.
-- It works only when no approved admin exists yet.
create or replace function public.bootstrap_first_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if exists (select 1 from public.profiles where role = 'admin' and approval_status = 'approved') then
    return false;
  end if;

  update public.profiles
  set role = 'admin', approval_status = 'approved', approved_at = now(), approved_by = auth.uid()
  where id = auth.uid();

  return true;
end;
$$;

create or replace function public.approve_user(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admin can approve users';
  end if;

  update public.profiles
  set approval_status = 'approved', approved_at = now(), approved_by = auth.uid()
  where id = target_user_id;

  return true;
end;
$$;

create or replace function public.reject_user(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admin can reject users';
  end if;

  update public.profiles
  set approval_status = 'rejected', approved_at = null, approved_by = auth.uid()
  where id = target_user_id;

  return true;
end;
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

-- =========================
-- Tasks
-- =========================
create table if not exists public.tasks (
  id text primary key,
  user_id uuid default auth.uid(),
  title text not null default '',
  project text default '',
  category text default '',
  priority text default 'Medium',
  status text default 'Not Started',
  start_date date,
  due_date date,
  description text default '',
  progress int default 0,
  people text default '',
  tags text default '',
  links text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz,
  history jsonb default '[]'::jsonb
);

-- Fix older tables created without user_id or newer columns
alter table public.tasks add column if not exists user_id uuid default auth.uid();
alter table public.tasks add column if not exists people text default '';
alter table public.tasks add column if not exists tags text default '';
alter table public.tasks add column if not exists links text default '';
alter table public.tasks add column if not exists completed_at timestamptz;
alter table public.tasks add column if not exists history jsonb default '[]'::jsonb;
update public.tasks set user_id = auth.uid() where user_id is null and auth.uid() is not null;
alter table public.tasks alter column user_id set default auth.uid();

-- =========================
-- Shipments
-- =========================
create table if not exists public.shipments (
  id text primary key,
  user_id uuid default auth.uid(),
  name text default '',
  tag text default '',
  po text default '',
  pi text default '',
  supplier text default '',
  forwarder text default '',
  shipping_line text default '',
  vessel text default '',
  voyage text default '',
  container_no text default '',
  origin_port text default '',
  destination_port text default '',
  supplier_confirm_date date,
  forwarder_confirm_date date,
  planned_ship_date date,
  etd date,
  eta date,
  actual_departure date,
  actual_arrival date,
  warehouse_date date,
  status text default 'Supplier Confirm',
  remark text default '',
  links text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  history jsonb default '[]'::jsonb
);

alter table public.shipments add column if not exists user_id uuid default auth.uid();
alter table public.shipments add column if not exists links text default '';
alter table public.shipments add column if not exists history jsonb default '[]'::jsonb;
update public.shipments set user_id = auth.uid() where user_id is null and auth.uid() is not null;
alter table public.shipments alter column user_id set default auth.uid();

alter table public.tasks enable row level security;
alter table public.shipments enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_select_own" on public.tasks for select using (auth.uid() = user_id and public.is_approved_user());
create policy "tasks_insert_own" on public.tasks for insert with check (auth.uid() = user_id and public.is_approved_user());
create policy "tasks_update_own" on public.tasks for update using (auth.uid() = user_id and public.is_approved_user()) with check (auth.uid() = user_id and public.is_approved_user());
create policy "tasks_delete_own" on public.tasks for delete using (auth.uid() = user_id and public.is_approved_user());

drop policy if exists "shipments_select_own" on public.shipments;
drop policy if exists "shipments_insert_own" on public.shipments;
drop policy if exists "shipments_update_own" on public.shipments;
drop policy if exists "shipments_delete_own" on public.shipments;
create policy "shipments_select_own" on public.shipments for select using (auth.uid() = user_id and public.is_approved_user());
create policy "shipments_insert_own" on public.shipments for insert with check (auth.uid() = user_id and public.is_approved_user());
create policy "shipments_update_own" on public.shipments for update using (auth.uid() = user_id and public.is_approved_user()) with check (auth.uid() = user_id and public.is_approved_user());
create policy "shipments_delete_own" on public.shipments for delete using (auth.uid() = user_id and public.is_approved_user());

-- Storage bucket for attachments.
insert into storage.buckets (id, name, public)
values ('workspace-files', 'workspace-files', true)
on conflict (id) do nothing;

drop policy if exists "workspace_files_read" on storage.objects;
drop policy if exists "workspace_files_insert" on storage.objects;
drop policy if exists "workspace_files_update" on storage.objects;
drop policy if exists "workspace_files_delete" on storage.objects;
create policy "workspace_files_read" on storage.objects for select using (bucket_id = 'workspace-files');
create policy "workspace_files_insert" on storage.objects for insert with check (bucket_id = 'workspace-files' and auth.role() = 'authenticated' and public.is_approved_user());
create policy "workspace_files_update" on storage.objects for update using (bucket_id = 'workspace-files' and auth.role() = 'authenticated' and public.is_approved_user());
create policy "workspace_files_delete" on storage.objects for delete using (bucket_id = 'workspace-files' and auth.role() = 'authenticated' and public.is_approved_user());

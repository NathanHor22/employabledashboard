-- ============================================================
-- Employable Dashboard — Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================

-- Extension
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────────────
-- Tables
-- ──────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  full_name   text,
  avatar_url  text,
  company_name text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.resumes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  file_name   text not null,
  file_path   text not null,
  file_size   integer not null,
  is_current  boolean not null default false,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  type       text not null check (type in ('ef', 'me_manual')),
  data       jsonb not null default '{}',
  status     text not null default 'draft' check (status in ('draft', 'submitted')),
  ef_score   numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_resources (
  id               uuid primary key default uuid_generate_v4(),
  category         text not null check (category in ('mental_health', 'physical_health', 'late_diagnosis', 'social_groups')),
  title            text not null,
  description      text,
  provider_name    text,
  provider_logo_url text,
  external_url     text,
  booking_url      text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- Auto-create profile on signup
-- ──────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────────────────────────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────────────────────────

alter table public.profiles         enable row level security;
alter table public.resumes          enable row level security;
alter table public.assessments      enable row level security;
alter table public.support_resources enable row level security;

-- Profiles policies
create policy "Users: view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users: update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins: view all profiles"
  on public.profiles for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Admins: update all profiles"
  on public.profiles for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Resumes policies
create policy "Users: CRUD own resumes"
  on public.resumes for all
  using (auth.uid() = user_id);

create policy "Admins: view all resumes"
  on public.resumes for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Assessments policies
create policy "Users: CRUD own assessments"
  on public.assessments for all
  using (auth.uid() = user_id);

create policy "Admins: view all assessments"
  on public.assessments for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Support resources policies
create policy "Authenticated: view active resources"
  on public.support_resources for select
  using (auth.role() = 'authenticated' and is_active = true);

create policy "Admins: full access to resources"
  on public.support_resources for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- ──────────────────────────────────────────────────────────────
-- Storage bucket for resumes
-- Run this separately in Supabase > Storage after creating schema
-- ──────────────────────────────────────────────────────────────
-- insert into storage.buckets (id, name, public)
-- values ('resumes', 'resumes', false);
--
-- create policy "Users: upload own resumes"
--   on storage.objects for insert
--   with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "Users: read own resumes"
--   on storage.objects for select
--   using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "Users: delete own resumes"
--   on storage.objects for delete
--   using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

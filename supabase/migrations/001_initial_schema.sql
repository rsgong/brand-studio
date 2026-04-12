-- Fresh Context Brand Studio — initial schema
-- Run this in the Supabase SQL Editor for your new project

-- ── Enums ───────────────────────────────────────────────────────────────

create type media_type as enum ('image', 'video');
create type generation_status as enum ('pending', 'generating', 'complete', 'failed');
create type user_role as enum ('admin', 'editor', 'viewer');

-- ── Profiles ────────────────────────────────────────────────────────────
-- Auto-populated from auth.users via trigger

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  avatar_url text,
  role user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view all profiles"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Shot Types ──────────────────────────────────────────────────────────

create table shot_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  media_type media_type not null default 'image',
  system_prompt text not null default '',
  default_aspect_ratio text not null default '16:9',
  default_variants integer not null default 3,
  reference_image_urls text[] not null default '{}',
  parameter_visibility jsonb not null default '{}',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

alter table shot_types enable row level security;

create policy "Authenticated users can view shot types"
  on shot_types for select using (auth.role() = 'authenticated');

create policy "Admins and editors can manage shot types"
  on shot_types for all using (
    exists (
      select 1 from profiles where id = auth.uid() and role in ('admin', 'editor')
    )
  );

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger shot_types_updated_at
  before update on shot_types
  for each row execute function update_updated_at();

-- ── Generations ─────────────────────────────────────────────────────────

create table generations (
  id uuid primary key default gen_random_uuid(),
  shot_type_id uuid not null references shot_types(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  prompt text not null,
  media_type media_type not null default 'image',
  aspect_ratio text not null default '16:9',
  variants integer not null default 2,
  status generation_status not null default 'pending',
  result_urls text[] not null default '{}',
  error_message text,
  user_image_url text,
  starred boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table generations enable row level security;

create policy "Users can view all generations"
  on generations for select using (auth.role() = 'authenticated');

create policy "Users can insert own generations"
  on generations for insert with check (auth.uid() = user_id);

create policy "Users can update own generations"
  on generations for update using (auth.uid() = user_id);

-- ── Storage bucket ──────────────────────────────────────────────────────
-- Run separately or via Supabase dashboard:
-- insert into storage.buckets (id, name, public) values ('generation-assets', 'generation-assets', true);

-- ── Indexes ─────────────────────────────────────────────────────────────

create index idx_generations_shot_type on generations(shot_type_id, created_at desc);
create index idx_generations_user on generations(user_id, created_at desc);
create index idx_generations_status on generations(status) where status != 'complete';

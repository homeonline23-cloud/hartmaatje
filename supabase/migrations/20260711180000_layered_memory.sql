-- Layered HartMaatje memory (profile + episodic) for logged-in Supabase users.
-- Next.js file store works for guest/dev; run this when bridging auth users.

create table if not exists public.resident_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.memory_episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  summary text not null,
  occurred_at timestamptz not null default now(),
  tags text[] not null default '{}',
  emotional_tone text,
  importance real not null default 0.5,
  source_turn text,
  created_at timestamptz not null default now()
);

create index if not exists memory_episodes_user_time_idx
  on public.memory_episodes (user_id, occurred_at desc);

alter table public.resident_profiles enable row level security;
alter table public.memory_episodes enable row level security;

drop policy if exists resident_profiles_select on public.resident_profiles;
drop policy if exists resident_profiles_insert on public.resident_profiles;
drop policy if exists resident_profiles_update on public.resident_profiles;
drop policy if exists resident_profiles_delete on public.resident_profiles;

create policy resident_profiles_select on public.resident_profiles for select using (auth.uid() = user_id);
create policy resident_profiles_insert on public.resident_profiles for insert with check (auth.uid() = user_id);
create policy resident_profiles_update on public.resident_profiles for update using (auth.uid() = user_id);
create policy resident_profiles_delete on public.resident_profiles for delete using (auth.uid() = user_id);

drop policy if exists memory_episodes_select on public.memory_episodes;
drop policy if exists memory_episodes_insert on public.memory_episodes;
drop policy if exists memory_episodes_update on public.memory_episodes;
drop policy if exists memory_episodes_delete on public.memory_episodes;

create policy memory_episodes_select on public.memory_episodes for select using (auth.uid() = user_id);
create policy memory_episodes_insert on public.memory_episodes for insert with check (auth.uid() = user_id);
create policy memory_episodes_update on public.memory_episodes for update using (auth.uid() = user_id);
create policy memory_episodes_delete on public.memory_episodes for delete using (auth.uid() = user_id);

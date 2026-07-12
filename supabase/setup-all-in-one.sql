-- =====================================================================
-- AI Chat Partner — alle database-migraties in één bestand
-- Plak dit volledige bestand in Supabase Dashboard > SQL Editor > Run.
-- Veilig om opnieuw te draaien (alle CREATE statements zijn idempotent).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Profielen, toestemmingen en audit
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  address_form text not null default 'formeel'
    check (address_form in ('formeel', 'informeel')),
  intro_seen_at timestamptz,
  consent_account_at timestamptz,
  consent_voice_at timestamptz,
  consent_memory_at timestamptz,
  consent_analytics_at timestamptz,
  consent_cloud_at timestamptz,
  consents_completed_at timestamptz,
  consent_document_version text not null default '1.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consent_audit (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (
    kind in (
      'account',
      'voice',
      'memory',
      'analytics',
      'cloud_processing'
    )
  ),
  granted boolean not null,
  consent_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists consent_audit_user_id_idx on public.consent_audit (user_id);

alter table public.consent_audit drop constraint if exists consent_audit_kind_ok;
alter table public.consent_audit add constraint consent_audit_kind_ok check (
  kind in (
    'account',
    'voice',
    'memory',
    'analytics',
    'cloud_processing'
  )
);

alter table public.profiles enable row level security;
alter table public.consent_audit enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists consent_audit_select_own on public.consent_audit;
drop policy if exists consent_audit_insert_own on public.consent_audit;

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);
create policy consent_audit_select_own on public.consent_audit
  for select using (auth.uid() = user_id);
create policy consent_audit_insert_own on public.consent_audit
  for insert with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ---------------------------------------------------------------------
-- 2) Gespreksthreads en berichten
-- ---------------------------------------------------------------------
create table if not exists public.conversation_threads (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversation_threads_user_idx on public.conversation_threads (user_id);
create index if not exists conversation_threads_user_updated_idx
  on public.conversation_threads (user_id, updated_at desc);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid (),
  thread_id uuid not null references public.conversation_threads (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists conversation_messages_thread_time_idx on public.conversation_messages (thread_id, created_at);

alter table public.conversation_threads enable row level security;
alter table public.conversation_messages enable row level security;

drop policy if exists conversation_threads_select on public.conversation_threads;
drop policy if exists conversation_threads_insert on public.conversation_threads;
drop policy if exists conversation_threads_update on public.conversation_threads;
drop policy if exists conversation_threads_delete on public.conversation_threads;
drop policy if exists conversation_messages_select on public.conversation_messages;
drop policy if exists conversation_messages_insert on public.conversation_messages;

create policy conversation_threads_select on public.conversation_threads for select using (auth.uid() = user_id);
create policy conversation_threads_insert on public.conversation_threads for insert with check (auth.uid() = user_id);
create policy conversation_threads_update on public.conversation_threads for update using (auth.uid() = user_id);
create policy conversation_threads_delete on public.conversation_threads for delete using (auth.uid() = user_id);

create policy conversation_messages_select on public.conversation_messages for select using (
  exists (
    select 1
    from public.conversation_threads t
    where t.id = conversation_messages.thread_id and t.user_id = auth.uid()
  )
);

create or replace function public.touch_thread_on_message ()
returns trigger language plpgsql as $$
begin
  update public.conversation_threads
  set updated_at = now ()
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists conversation_messages_touch_thread on public.conversation_messages;
create trigger conversation_messages_touch_thread
  after insert on public.conversation_messages
  for each row execute procedure public.touch_thread_on_message ();


-- ---------------------------------------------------------------------
-- 3) Geheugen (feiten + samenvatting)
-- ---------------------------------------------------------------------
alter table public.conversation_threads add column if not exists memory_summary_nl text;

create table if not exists public.memory_facts (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create index if not exists memory_facts_user_updated_idx on public.memory_facts (user_id, updated_at desc);

alter table public.memory_facts enable row level security;

drop policy if exists memory_facts_select on public.memory_facts;
drop policy if exists memory_facts_insert on public.memory_facts;
drop policy if exists memory_facts_update on public.memory_facts;
drop policy if exists memory_facts_delete on public.memory_facts;

create policy memory_facts_select on public.memory_facts for select using (auth.uid() = user_id);
create policy memory_facts_insert on public.memory_facts for insert with check (auth.uid() = user_id);
create policy memory_facts_update on public.memory_facts for update using (auth.uid() = user_id);
create policy memory_facts_delete on public.memory_facts for delete using (auth.uid() = user_id);

drop trigger if exists memory_facts_set_updated_at on public.memory_facts;
create trigger memory_facts_set_updated_at
  before update on public.memory_facts
  for each row execute procedure public.set_updated_at();


-- ---------------------------------------------------------------------
-- 4) Voice profile (TTS preset + snelheid)
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists tts_preset_id text not null default 'fenna';

comment on column public.profiles.tts_preset_id is
  'Permanente HartMaatje-stemidentiteit: maarten, peter, fenna, colette. Oude waarden (nl_female_a e.d.) worden in de app omgezet.';

alter table public.profiles
  add column if not exists tts_playback_rate real not null default 0.8;

alter table public.profiles drop constraint if exists profiles_tts_playback_chk;
alter table public.profiles add constraint profiles_tts_playback_chk check (
  tts_playback_rate between 0.78 and 1.32
);


-- ---------------------------------------------------------------------
-- 5) Partner-avatar opslag (private bucket)
-- ---------------------------------------------------------------------
alter table public.profiles
add column if not exists partner_avatar_path text;

comment on column public.profiles.partner_avatar_path is
  'Object path inside storage bucket partner_avatars, e.g. {user_uuid}/partner.jpg; null if none.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner_avatars',
  'partner_avatars',
  false,
  5242880,
  array['image/jpeg'::text]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists partner_avatars_select_own on storage.objects;
drop policy if exists partner_avatars_insert_own on storage.objects;
drop policy if exists partner_avatars_update_own on storage.objects;
drop policy if exists partner_avatars_delete_own on storage.objects;

create policy partner_avatars_select_own on storage.objects
  for select to authenticated using (
    bucket_id = 'partner_avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy partner_avatars_insert_own on storage.objects
  for insert to authenticated with check (
    bucket_id = 'partner_avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy partner_avatars_update_own on storage.objects
  for update to authenticated using (
    bucket_id = 'partner_avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'partner_avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy partner_avatars_delete_own on storage.objects
  for delete to authenticated using (
    bucket_id = 'partner_avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );


-- ---------------------------------------------------------------------
-- 6) Bewaartermijnen + interne rate-limit RPCs
-- ---------------------------------------------------------------------
alter table public.profiles
add column if not exists message_retention_days integer;

alter table public.profiles drop constraint if exists profiles_message_retention_days_ok;

alter table public.profiles add constraint profiles_message_retention_days_ok
  check (
    message_retention_days is null
    or (message_retention_days >= 90 and message_retention_days <= 2555)
  );

comment on column public.profiles.message_retention_days is
  'Berichten ouder dan dit aantal dagen worden periodiek verwijderd (RPC retention-sweep). NULL = uit.';

create table if not exists public.api_rate_events (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);

create index if not exists api_rate_events_user_kind_time_idx
  on public.api_rate_events (user_id, kind, created_at desc);

alter table public.api_rate_events enable row level security;

drop policy if exists api_rate_events_service_only on public.api_rate_events;
create policy api_rate_events_service_only on public.api_rate_events
  for all using (false) with check (false);

create or replace function public.rate_limit_try_consume(p_user_id uuid, p_kind text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  max_n int;
  win_sec int;
  cnt int;
begin
  if p_kind = 'chat' then
    max_n := 48;
    win_sec := 3600;
  elsif p_kind = 'transcribe' then
    max_n := 36;
    win_sec := 3600;
  else
    max_n := 120;
    win_sec := 3600;
  end if;

  select count(*)::int into cnt
  from public.api_rate_events
  where user_id = p_user_id
    and kind = p_kind
    and created_at > now() - (win_sec * interval '1 second');

  if cnt >= max_n then
    return false;
  end if;

  insert into public.api_rate_events (user_id, kind) values (p_user_id, p_kind);
  return true;
end;
$$;

create or replace function public.run_message_retention_sweep()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  del_msg bigint := 0;
  del_thr bigint := 0;
  pruned bigint := 0;
begin
  delete from public.api_rate_events
  where created_at < now() - interval '72 hours';
  get diagnostics pruned = row_count;

  delete from public.conversation_messages cm
  using public.conversation_threads ct, public.profiles p
  where cm.thread_id = ct.id
    and ct.user_id = p.id
    and p.message_retention_days is not null
    and cm.created_at < now() - (p.message_retention_days * interval '1 day');

  get diagnostics del_msg = row_count;

  delete from public.conversation_threads ct
  where not exists (
    select 1 from public.conversation_messages cm where cm.thread_id = ct.id
  );

  get diagnostics del_thr = row_count;

  return json_build_object(
    'pruned_rate_events', pruned,
    'deleted_messages', del_msg,
    'deleted_empty_threads', del_thr
  );
end;
$$;

revoke all on function public.rate_limit_try_consume(uuid, text) from public;
revoke all on function public.run_message_retention_sweep() from public;

grant execute on function public.rate_limit_try_consume(uuid, text) to service_role;
grant execute on function public.run_message_retention_sweep() to service_role;


-- =====================================================================
-- KLAAR. U zou onderaan "Success. No rows returned" moeten zien.
-- Ga nu terug naar de app en herlaad de pagina.
-- =====================================================================

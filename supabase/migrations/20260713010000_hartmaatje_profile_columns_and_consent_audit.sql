-- HartMaatje-kolommen op bestaand Supabase Base-profiel + consent_audit voor de app.
-- Idempotent — veilig opnieuw te draaien.

alter table public.profiles
  add column if not exists address_form text not null default 'formeel';

alter table public.profiles
  add column if not exists intro_seen_at timestamptz;

alter table public.profiles
  add column if not exists consent_account_at timestamptz;

alter table public.profiles
  add column if not exists consent_voice_at timestamptz;

alter table public.profiles
  add column if not exists consent_memory_at timestamptz;

alter table public.profiles
  add column if not exists consent_analytics_at timestamptz;

alter table public.profiles
  add column if not exists consent_cloud_at timestamptz;

alter table public.profiles
  add column if not exists consents_completed_at timestamptz;

alter table public.profiles
  add column if not exists consent_document_version text not null default '1.0';

alter table public.profiles
  add column if not exists tts_preset_id text not null default 'fenna';

alter table public.profiles
  add column if not exists tts_playback_rate real not null default 0.8;

alter table public.profiles
  add column if not exists partner_avatar_path text;

alter table public.profiles
  add column if not exists message_retention_days integer;

alter table public.profiles drop constraint if exists profiles_address_form_check;
alter table public.profiles add constraint profiles_address_form_check check (
  address_form in ('formeel', 'informeel')
);

alter table public.profiles drop constraint if exists profiles_tts_playback_chk;
alter table public.profiles add constraint profiles_tts_playback_chk check (
  tts_playback_rate between 0.78 and 1.32
);

alter table public.profiles drop constraint if exists profiles_message_retention_days_ok;
alter table public.profiles add constraint profiles_message_retention_days_ok check (
  message_retention_days is null
  or (message_retention_days >= 90 and message_retention_days <= 2555)
);

create table if not exists public.consent_audit (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
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

alter table public.consent_audit enable row level security;

drop policy if exists consent_audit_select_own on public.consent_audit;
drop policy if exists consent_audit_insert_own on public.consent_audit;

create policy consent_audit_select_own on public.consent_audit
  for select using (auth.uid() = user_id);

create policy consent_audit_insert_own on public.consent_audit
  for insert with check (auth.uid() = user_id);

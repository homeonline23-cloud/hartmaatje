-- Vector memory store (pgvector) — semantic recall per resident.
-- Run in Supabase Dashboard → SQL Editor, or: supabase db push
--
-- Embedding size: 768 = Gemini text-embedding-004 (HartMaatje default).
-- For OpenAI ada-002 / text-embedding-3-small use 1536 and set MEMORY_EMBEDDING_DIM=1536.

create extension if not exists vector with schema extensions;

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  resident_id text not null,
  session_id text,
  content text not null,
  memory_type text not null default 'fact'
    check (memory_type in ('fact', 'profile', 'episodic', 'preference', 'routine', 'emotional')),
  importance real not null default 0.5
    check (importance >= 0 and importance <= 1),
  embedding vector(768),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists idx_memories_resident_id on public.memories (resident_id);
create index if not exists idx_memories_memory_type on public.memories (memory_type);
create index if not exists idx_memories_resident_created
  on public.memories (resident_id, created_at desc);

-- HNSW: works on empty tables. For ivfflat instead (after ~1000 rows):
-- CREATE INDEX idx_memories_embedding ON memories
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
create index if not exists idx_memories_embedding
  on public.memories
  using hnsw (embedding vector_cosine_ops);

create or replace function public.match_memories(
  p_resident_id text,
  p_query_embedding vector(768),
  p_match_count int default 5,
  p_memory_types text[] default null
)
returns table (
  id uuid,
  resident_id text,
  content text,
  memory_type text,
  importance real,
  metadata jsonb,
  similarity real
)
language sql
stable
as $$
  select
    m.id,
    m.resident_id,
    m.content,
    m.memory_type,
    m.importance,
    m.metadata,
    (1 - (m.embedding <=> p_query_embedding))::real as similarity
  from public.memories m
  where m.resident_id = p_resident_id
    and m.embedding is not null
    and (p_memory_types is null or m.memory_type = any (p_memory_types))
  order by m.embedding <=> p_query_embedding
  limit greatest(p_match_count, 1);
$$;

alter table public.memories enable row level security;

-- Block direct client access; server uses service role (bypasses RLS).
drop policy if exists memories_no_direct_client on public.memories;
create policy memories_no_direct_client on public.memories
  for all
  using (false)
  with check (false);

comment on table public.memories is
  'Semantic memory per resident. All characters (Fenna, Maarten, Peter, Colette) share one resident_id.';

/**
 * Optional Supabase pgvector memory — activates when service role + Gemini are configured.
 * File-based memory in orchestrator.ts remains the default for local/guest dev.
 */

import type { AppLang } from "@/lib/languages";

export const MEMORY_EMBEDDING_DIM = Number(process.env.MEMORY_EMBEDDING_DIM ?? "768");

export type VectorMemoryRow = {
  id: string;
  resident_id: string;
  content: string;
  memory_type: string;
  importance: number;
  metadata: Record<string, unknown>;
  similarity?: number;
};

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

/** Gemini text embedding (768 dims by default). */
export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || !text.trim()) return null;

  const model =
    process.env.GEMINI_EMBEDDING_MODEL?.trim() || "text-embedding-004";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${model}`,
        content: { parts: [{ text: text.trim().slice(0, 2000) }] },
        outputDimensionality: MEMORY_EMBEDDING_DIM,
      }),
    },
  );

  if (!res.ok) return null;

  const json = (await res.json()) as {
    embedding?: { values?: number[] };
  };
  const values = json.embedding?.values;
  if (!values?.length) return null;
  return values;
}

async function supabaseAdminFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: init?.method === "POST" ? "return=representation" : "",
      ...init?.headers,
    },
  });
}

export async function storeVectorMemory(input: {
  residentId: string;
  content: string;
  memoryType?: string;
  importance?: number;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  lang?: AppLang;
}): Promise<boolean> {
  if (!supabaseConfigured()) return false;

  const embedding = await embedText(input.content);
  if (!embedding) return false;

  const res = await supabaseAdminFetch("memories", {
    method: "POST",
    body: JSON.stringify({
      resident_id: input.residentId,
      session_id: input.sessionId ?? null,
      content: input.content.trim().slice(0, 500),
      memory_type: input.memoryType ?? "fact",
      importance: input.importance ?? 0.5,
      embedding,
      metadata: input.metadata ?? {},
    }),
  });

  return res.ok;
}

export async function retrieveVectorMemories(
  residentId: string,
  queryText: string,
  limit = 5,
): Promise<VectorMemoryRow[]> {
  if (!supabaseConfigured()) return [];

  const embedding = await embedText(queryText);
  if (!embedding) return [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${url}/rest/v1/rpc/match_memories`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_resident_id: residentId,
      p_query_embedding: embedding,
      p_match_count: limit,
    }),
  });

  if (!res.ok) return [];

  const rows = (await res.json()) as VectorMemoryRow[];
  return Array.isArray(rows) ? rows : [];
}

export function formatVectorMemoriesForPrompt(
  rows: VectorMemoryRow[],
  lang: AppLang,
): string {
  if (!rows.length) return "";
  const header =
    lang === "en"
      ? "Semantic memories (use gently):"
      : "Semantische herinneringen (zacht gebruiken):";
  const lines = rows.map(
    (r) => `- [${r.memory_type}] ${r.content.slice(0, 140)}`,
  );
  return `${header}\n${lines.join("\n")}`;
}

import { CONSENT_DOCUMENT_VERSION } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";

export type UserDataExport = {
  export_meta: {
    generated_at: string;
    app: "HartMaatje";
    consent_document_version: string;
  };
  account: { user_id: string; email: string | undefined };
  profile: Record<string, unknown> | null;
  memory_facts: unknown[];
  conversations: { thread: Record<string, unknown>; messages: unknown[] }[];
  consent_audit: unknown[];
};

export async function buildUserDataExport(): Promise<{
  data: UserDataExport;
  error?: string;
}> {
  const client = getSupabase();
  if (!client) return { data: emptyShell(), error: "Geen verbinding." };

  const { data: sessionData } = await client.auth.getSession();
  const uid = sessionData.session?.user?.id;
  const email = sessionData.session?.user?.email;
  if (!uid) return { data: emptyShell(), error: "Niet ingelogd." };

  const [prof, facts, threads, audit] = await Promise.all([
    client.from("profiles").select("*").eq("id", uid).maybeSingle(),
    client
      .from("memory_facts")
      .select("*")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false }),
    client
      .from("conversation_threads")
      .select("*")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false }),
    client
      .from("consent_audit")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),
  ]);

  const firstErr =
    prof.error || facts.error || threads.error || audit.error;
  if (firstErr) return { data: emptyShell(), error: firstErr.message };

  const threadRows = threads.data ?? [];
  const threadIds = threadRows
    .map((t) => (t as { id: string }).id)
    .filter(Boolean);

  const msgRes =
    threadIds.length > 0
      ? await client
          .from("conversation_messages")
          .select("*")
          .in("thread_id", threadIds)
          .order("created_at", { ascending: true })
      : { data: [] as unknown[], error: null };

  if (msgRes.error) return { data: emptyShell(), error: msgRes.error.message };

  const byThread = new Map<string, unknown[]>();
  for (const m of msgRes.data ?? []) {
    const tid = (m as { thread_id: string }).thread_id;
    if (!byThread.has(tid)) byThread.set(tid, []);
    byThread.get(tid)!.push(m);
  }

  const conversations = threadRows.map((t) => ({
    thread: t as Record<string, unknown>,
    messages: byThread.get((t as { id: string }).id) ?? [],
  }));

  return {
    data: {
      export_meta: {
        generated_at: new Date().toISOString(),
        app: "HartMaatje",
        consent_document_version: CONSENT_DOCUMENT_VERSION,
      },
      account: { user_id: uid, email },
      profile: (prof.data as Record<string, unknown>) ?? null,
      memory_facts: facts.data ?? [],
      conversations,
      consent_audit: audit.data ?? [],
    },
  };
}

/** Download een JSON-export via de browser. */
export async function downloadUserDataExport(): Promise<{ error?: string }> {
  const { data, error } = await buildUserDataExport();
  if (error) return { error };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ai-chat-partner-export-${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return {};
}

function emptyShell(): UserDataExport {
  return {
    export_meta: {
      generated_at: new Date().toISOString(),
      app: "HartMaatje",
      consent_document_version: CONSENT_DOCUMENT_VERSION,
    },
    account: { user_id: "", email: undefined },
    profile: null,
    memory_facts: [],
    conversations: [],
    consent_audit: [],
  };
}

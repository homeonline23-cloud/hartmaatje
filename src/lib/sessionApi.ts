import { resolveApiBase, resolveWsBase } from "@/lib/apiHost";

export type CompanionId = "fenna" | "maarten" | "peter" | "colette";

export type SessionResponse = {
  session_id: string;
  session_token: string;
  user_id: string;
  current_state: string;
  ws_url: string;
  locale: string;
  companion_id: string | null;
  display_name?: string;
};

async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const API_BASE = resolveApiBase();
  try {
    return await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new Error("Kan de server niet bereiken. Controleer uw verbinding.");
  }
}

export async function createSession(input: {
  companion_id: CompanionId;
  display_name?: string;
  external_user_id?: string;
  locale?: string;
}): Promise<SessionResponse> {
  const res = await apiFetch("/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      external_user_id: input.external_user_id ?? "demo-user-1",
      display_name: input.display_name ?? "Annie",
      device_type: "tablet-web",
      locale: input.locale ?? "nl-NL",
      companion_id: input.companion_id,
    }),
  });
  if (!res.ok) {
    throw new Error(`Session start failed (${res.status})`);
  }
  return res.json();
}

export async function clearSessionHistory(sessionId: string): Promise<void> {
  try {
    await apiFetch(`/sessions/${sessionId}/clear-history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  } catch {
    /* ignore — session may already be gone */
  }
}

export async function closeSession(sessionId: string): Promise<void> {
  try {
    await apiFetch(`/sessions/${sessionId}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "client_close" }),
    });
  } catch {
    /* ignore close failures */
  }
}

export async function patchSessionLocale(
  sessionId: string,
  locale: string
): Promise<SessionResponse> {
  const res = await apiFetch(`/sessions/${sessionId}/locale`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale }),
  });
  if (!res.ok) {
    throw new Error(`Locale update failed (${res.status})`);
  }
  return res.json();
}

export function wsUrlForSession(sessionId: string): string {
  const url = new URL(resolveWsBase());
  url.searchParams.set("session_id", sessionId);
  return url.toString();
}

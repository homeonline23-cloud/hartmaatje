import type { AppLang } from "@/lib/languages";

export type FennaMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "hartmaatje_fenna_chat_v1";

export function loadFennaMessages(): FennaMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FennaMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFennaMessages(items: FennaMessage[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function clearFennaMessages() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export async function sendFennaMessage(
  message: string,
  lang: AppLang,
  history: FennaMessage[],
  residentId = "guest",
  sessionId?: string,
): Promise<{ reply: string; error?: string }> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        lang,
        identityId: "fenna",
        resident_id: residentId,
        session_id: sessionId,
        history: history.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    const data = (await res.json()) as { reply?: string; error?: string };
    if (!res.ok || !data.reply) {
      return {
        reply: "",
        error: data.error ?? "Geen antwoord ontvangen.",
      };
    }
    return { reply: data.reply };
  } catch {
    return { reply: "", error: "Geen verbinding." };
  }
}

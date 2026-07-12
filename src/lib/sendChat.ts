import { getSupabase, getAuthSession } from "@/lib/supabase";
import { getAppCopy } from "@/lib/appLocale";
import { guestReply } from "@/lib/guestChat";
import { DEFAULT_APP_LANG, type AppLang } from "@/lib/languages";
import type { VoiceIdentityId } from "@/lib/voice/types";

export type ChatCompletionResult = {
  thread_id: string;
  reply: string;
  assistant_message_id: string | null;
  prompt_version: string;
};

type ChatFnBody = Partial<ChatCompletionResult> & { error?: string };

type GuestHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

async function isLoggedIn(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  const session = await getAuthSession(client);
  return Boolean(session?.access_token);
}

async function guestChatViaApi(
  message: string,
  lang: AppLang,
  identityId: VoiceIdentityId,
  history: GuestHistoryItem[],
): Promise<ChatCompletionResult> {
  try {
    const residentId =
      typeof window !== "undefined"
        ? localStorage.getItem("hartmaatje_resident") ?? "guest"
        : "guest";
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        lang,
        identityId,
        history,
        resident_id: residentId,
      }),
    });
    if (!res.ok) throw new Error("api failed");
    const data = (await res.json()) as {
      reply?: string;
      prompt_version?: string;
    };
    if (!data.reply) throw new Error("empty reply");
    return {
      thread_id: "local",
      reply: data.reply,
      assistant_message_id: null,
      prompt_version: data.prompt_version ?? "guest-gemini",
    };
  } catch {
    return {
      thread_id: "local",
      reply: guestReply(message, lang),
      assistant_message_id: null,
      prompt_version: "guest",
    };
  }
}

export async function sendChatMessage(
  threadId: string | null | undefined,
  message: string,
  lang: AppLang = DEFAULT_APP_LANG,
  options?: {
    identityId?: VoiceIdentityId;
    history?: GuestHistoryItem[];
  },
): Promise<{ error: string | null; data: ChatCompletionResult | null }> {
  const errors = getAppCopy(lang).errors;
  const loggedIn = await isLoggedIn();

  if (!loggedIn) {
    return {
      error: null,
      data: await guestChatViaApi(
        message,
        lang,
        options?.identityId ?? "fenna",
        options?.history ?? [],
      ),
    };
  }

  const client = getSupabase();
  if (!client) {
    return {
      error: null,
      data: await guestChatViaApi(
        message,
        lang,
        options?.identityId ?? "fenna",
        options?.history ?? [],
      ),
    };
  }

  const { data, error } = await client.functions.invoke<ChatFnBody>("chat", {
    body: { thread_id: threadId ?? undefined, message },
  });

  if (error) {
    return {
      error: error.message ?? errors.couldNotConnect,
      data: null,
    };
  }

  const body = data ?? {};
  if (typeof body.error === "string" && body.error.trim()) {
    return { error: body.error.trim(), data: null };
  }

  const tid = body.thread_id;
  const reply = body.reply;
  if (typeof tid !== "string" || typeof reply !== "string") {
    return { error: errors.couldNotReadReply, data: null };
  }

  return {
    error: null,
    data: {
      thread_id: tid,
      reply,
      assistant_message_id:
        typeof body.assistant_message_id === "string"
          ? body.assistant_message_id
          : null,
      prompt_version:
        typeof body.prompt_version === "string" ? body.prompt_version : "?",
    },
  };
}

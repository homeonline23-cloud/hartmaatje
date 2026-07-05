import { getSupabase, getAuthSession } from "@/lib/supabase";
import { guestReply } from "@/lib/guestChat";

export type ChatCompletionResult = {
  thread_id: string;
  reply: string;
  assistant_message_id: string | null;
  prompt_version: string;
};

type ChatFnBody = Partial<ChatCompletionResult> & { error?: string };

async function isLoggedIn(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  const session = await getAuthSession(client);
  return Boolean(session?.access_token);
}

export async function sendChatMessage(
  threadId: string | null | undefined,
  message: string,
): Promise<{ error: string | null; data: ChatCompletionResult | null }> {
  const loggedIn = await isLoggedIn();

  if (!loggedIn) {
    return {
      error: null,
      data: {
        thread_id: threadId ?? "local",
        reply: guestReply(message),
        assistant_message_id: null,
        prompt_version: "guest",
      },
    };
  }

  const client = getSupabase();
  if (!client) {
    return {
      error: null,
      data: {
        thread_id: "local",
        reply: guestReply(message),
        assistant_message_id: null,
        prompt_version: "guest",
      },
    };
  }

  const { data, error } = await client.functions.invoke<ChatFnBody>("chat", {
    body: { thread_id: threadId ?? undefined, message },
  });

  if (error) {
    return {
      error: error.message ?? "Kon nu even geen verbinding maken.",
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
    return { error: "Kon het antwoord niet lezen.", data: null };
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

import { resolveApiBase } from "@/lib/apiHost";

export type VoiceTurnResponse = {
  ok: boolean;
  transcript: string;
  reply_text: string;
  audio_base64: string | null;
  audio_mime: string | null;
  error?: string;
  status?: number;
};

export type SpeakResponse = {
  ok: boolean;
  audio_base64: string | null;
  audio_mime: string | null;
  error?: string;
};

export type ChatStreamHandlers = {
  /** Called on every token with the full accumulated assistant text. */
  onToken?: (text: string, delta: string) => void;
  onFinal?: (text: string) => void;
  /** Fired when background Python TTS finishes (may arrive after streamChat returns). */
  onAudio?: (
    audioBase64: string | null,
    mime: string | null,
    text: string
  ) => void;
  /** Optional: scroll chat as tokens arrive. */
  onScroll?: () => void;
};

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const API_BASE = resolveApiBase();
  try {
    return await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new Error("Kan de server niet bereiken. Controleer uw verbinding.");
  }
}

export async function postSpeak(
  sessionId: string,
  text: string,
  opts?: { full?: boolean }
): Promise<SpeakResponse> {
  const res = await apiFetch(`/sessions/${sessionId}/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, full: opts?.full === true }),
  });
  if (!res.ok) {
    throw new Error(`Speak failed (${res.status})`);
  }
  return res.json();
}

function normalizeAudioMime(mimeType: string): string {
  const raw = (mimeType || "audio/webm").split(";")[0].trim().toLowerCase();
  if (raw === "audio/mp4" || raw === "video/mp4") return "audio/mp4";
  if (raw === "audio/ogg" || raw === "audio/opus") return "audio/ogg";
  if (raw.startsWith("audio/wav") || raw === "audio/x-wav") return "audio/wav";
  return "audio/webm";
}

export type StreamChatOpts = {
  companionId?: string;
  locale?: string;
  /** Prior user/assistant turns for rolling context (exclude the new user line). */
  messages?: { role: "user" | "assistant"; content: string }[];
};

type OllamaChatChunk = {
  message?: { role?: string; content?: string };
  done?: boolean;
};

/**
 * Reads the Next.js `/api/chat` Ollama stream chunk-by-chunk and updates the UI
 * token-by-token. Used for **text-only** messaging (not Voice Mode).
 * POSTs to Python `/sessions/{id}/speak` after the stream finishes (optional TTS).
 *
 * Voice Mode uses OpenAI Realtime via `/api/realtime` WebSocket instead.
 */
export async function streamChat(
  sessionId: string,
  text: string,
  handlers: ChatStreamHandlers = {},
  opts: StreamChatOpts = {}
): Promise<string> {
  // 1. Send history (+ current turn) to Next.js API
  const chatHistory = [
    ...(opts.messages || []),
    { role: "user" as const, content: text },
  ];

  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: chatHistory,
        text,
        sessionId,
        companionId: opts.companionId || "fenna",
        locale: opts.locale || "nl-NL",
      }),
    });
  } catch {
    throw new Error("Kan de server niet bereiken. Controleer uw verbinding.");
  }

  if (!response.ok || !response.body) {
    throw new Error(`Chat stream failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullResponseText = "";

  // 2. Consume streaming tokens → UI state updates instantly
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    // Ollama sends newline-separated JSON objects (keep partial line in buffer)
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as OllamaChatChunk;
        const content = parsed.message?.content || "";
        if (content) {
          fullResponseText += content;
          handlers.onToken?.(fullResponseText, content);
          handlers.onScroll?.();
        }
      } catch {
        /* skip malformed partial JSON */
      }
    }
  }

  // Flush trailing line
  buffer += decoder.decode();
  if (buffer.trim()) {
    try {
      const parsed = JSON.parse(buffer) as OllamaChatChunk;
      const content = parsed.message?.content || "";
      if (content) {
        fullResponseText += content;
        handlers.onToken?.(fullResponseText, content);
        handlers.onScroll?.();
      }
    } catch {
      /* ignore */
    }
  }

  // Stream finished — update final UI, then speak
  handlers.onFinal?.(fullResponseText);

  // 3. POST full text to Python /speak only after the stream finishes
  if (sessionId && fullResponseText.trim()) {
    const speakUrl = `${resolveApiBase()}/sessions/${sessionId}/speak`;
    void fetch(speakUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: fullResponseText }),
    })
      .then(async (res) => {
        if (!res.ok) {
          handlers.onAudio?.(null, null, fullResponseText);
          return;
        }
        const spoken = (await res.json()) as SpeakResponse;
        handlers.onAudio?.(
          spoken.audio_base64 ?? null,
          spoken.audio_mime ?? null,
          fullResponseText
        );
      })
      .catch(() => {
        handlers.onAudio?.(null, null, fullResponseText);
      });
  } else {
    handlers.onAudio?.(null, null, fullResponseText);
  }

  return fullResponseText;
}

export async function postVoiceTurn(
  sessionId: string,
  blob: Blob,
  mimeType: string,
  timeoutMs = 45_000
): Promise<VoiceTurnResponse> {
  const safeMime = normalizeAudioMime(mimeType || blob.type || "audio/webm");
  const ext = safeMime.includes("mp4")
    ? "mp4"
    : safeMime.includes("ogg")
      ? "ogg"
      : safeMime.includes("wav")
        ? "wav"
        : "webm";
  const form = new FormData();
  form.append("audio", blob, `utterance.${ext}`);
  form.append("mime_type", safeMime);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const apiBase = resolveApiBase();
  console.log("[hm-voice] POST voice-turn →", `${apiBase}/sessions/${sessionId}/voice-turn`, {
    bytes: blob.size,
    mime: safeMime,
  });
  try {
    const res = await apiFetch(`/sessions/${sessionId}/voice-turn`, {
      method: "POST",
      body: form,
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const err = new Error(`Voice turn failed (${res.status})`) as Error & {
        status?: number;
      };
      err.status = res.status;
      throw err;
    }
    const json = (await res.json()) as VoiceTurnResponse;
    console.log("[hm-voice] voice-turn result", {
      ok: json.ok,
      transcript: json.transcript,
      replyLen: json.reply_text?.length ?? 0,
      hasAudio: Boolean(json.audio_base64),
    });
    return json;
  } finally {
    clearTimeout(timer);
  }
}

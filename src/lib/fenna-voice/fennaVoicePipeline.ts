import { blobToBase64 } from "@/lib/fenna-voice/playback";
import { getCompanionVoiceAbortSignal } from "@/lib/fenna-voice/sessionControl";
import { voiceLog } from "@/lib/fenna-voice/voiceLogger";
import {
  CompanionApiError,
  parseApiErrorResponse,
} from "@/lib/http/companionApiError";
import {
  hartmaatjeApi,
  isBackendSessionId,
  toBackendLang,
  type AppLang,
  type FennaMessage,
} from "@/lib/hartmaatje-api/client";
import type { VoiceIdentityId } from "@/lib/voice/types";

export type VoiceTurnResult = {
  userText: string;
  reply: string;
  replyAudioBase64?: string;
  replyMimeType?: string;
  remainingText?: string;
  source: "backend" | "next";
  timings_ms?: Record<string, number>;
};

export type VoiceTurnStreamHandlers = {
  onUserText?: (text: string) => void;
  onReplyDelta?: (fullSoFar: string) => void;
};

async function backendTurn(
  blob: Blob,
  lang: AppLang,
  sessionId: string,
): Promise<VoiceTurnResult> {
  voiceLog("one-shot voice turn → backend /chat/voice-turn", {
    sessionId,
    bytes: blob.size,
    mime: blob.type || "audio/webm",
  });

  const base64 = await blobToBase64(blob);
  const data = await hartmaatjeApi.voiceTurn(
    sessionId,
    base64,
    blob.type || "audio/webm",
    lang,
    "complete",
  );

  const userText = (data.user_text ?? "").trim();
  const reply = (data.reply ?? "").trim();

  voiceLog("STT result", { text: userText, source: "backend" });
  voiceLog("LLM reply", { text: reply, chars: reply.length, source: "backend" });
  voiceLog("text ready", { timings_ms: data.timings_ms, source: "backend" });

  return {
    userText,
    reply,
    replyAudioBase64: data.audio_base64 || undefined,
    replyMimeType: data.mime_type || undefined,
    source: "backend",
    timings_ms: data.timings_ms,
  };
}

async function nextJsTurn(
  blob: Blob,
  lang: AppLang,
  history: FennaMessage[],
  residentId: string,
  sessionId: string | null,
  identityId: VoiceIdentityId = "fenna",
  addressForm: "formeel" | "informeel" = "formeel",
  handlers?: VoiceTurnStreamHandlers,
): Promise<VoiceTurnResult> {
  voiceLog("streaming voice turn → /api/fenna-voice-turn/stream", {
    identityId,
    bytes: blob.size,
    mime: blob.type || "audio/webm",
  });

  const base64 = await blobToBase64(blob);

  const timeoutMs = 45_000;
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
  const sessionSignal = getCompanionVoiceAbortSignal();
  if (sessionSignal?.aborted) timeoutController.abort();
  sessionSignal?.addEventListener("abort", () => timeoutController.abort(), {
    once: true,
  });

  try {
    const res = await fetch("/api/fenna-voice-turn/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_base64: base64,
        mime_type: blob.type || "audio/webm",
        lang: toBackendLang(lang),
        history: history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
        resident_id: residentId,
        session_id: sessionId ?? undefined,
        identity_id: identityId,
        address_form: addressForm,
      }),
      signal: timeoutController.signal,
    });

    if (!res.ok || !res.body) {
      if (res.status === 0 || getCompanionVoiceAbortSignal()?.aborted) {
        throw new Error("SESSION_ENDED");
      }
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw parseApiErrorResponse(
        res,
        data,
        lang === "en" ? "Speech failed." : "Spraak mislukt.",
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let userText = "";
    let reply = "";
    let timings_ms: Record<string, number> | undefined;

    const consume = (block: string) => {
      const line = block.split("\n").find((item) => item.startsWith("data:"));
      if (!line) return;
      const raw = line.slice(5).trim();
      if (!raw) return;
      const event = JSON.parse(raw) as {
        type?: string;
        userText?: string;
        text?: string;
        reply?: string;
        message?: string;
        timings_ms?: Record<string, number>;
      };
      if (event.type === "error") {
        throw new Error(event.message || (lang === "en" ? "Speech failed." : "Spraak mislukt."));
      }
      if (event.type === "stt" && event.userText) {
        userText = event.userText;
        handlers?.onUserText?.(userText);
        voiceLog("STT result", { text: userText, streamed: true });
      }
      if (event.type === "delta" && event.text) {
        reply += event.text;
        handlers?.onReplyDelta?.(reply);
      }
      if (event.type === "done") {
        userText = event.userText || userText;
        reply = event.reply || reply;
        timings_ms = event.timings_ms;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      for (const block of blocks) consume(block);
    }
    if (buffer.trim()) consume(buffer);

    voiceLog("LLM reply", { text: reply, chars: reply.length, streamed: true });
    return {
      userText: userText.trim(),
      reply: reply.trim(),
      source: "next",
      timings_ms,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      if (sessionSignal?.aborted) throw new Error("SESSION_ENDED");
      throw new Error(
        lang === "en"
          ? "That took too long — please try again."
          : "Het duurde te lang — probeer het nog eens.",
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function processCompanionVoiceTurn(
  blob: Blob,
  lang: AppLang,
  history: FennaMessage[],
  sessionId: string | null,
  residentId = "guest",
  identityId: VoiceIdentityId = "fenna",
  addressForm: "formeel" | "informeel" = "formeel",
  handlers?: VoiceTurnStreamHandlers,
): Promise<VoiceTurnResult> {
  if (isBackendSessionId(sessionId)) {
    try {
      return await backendTurn(blob, lang, sessionId);
    } catch (err) {
      voiceLog("backend voice turn failed — fallback to Next.js", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return nextJsTurn(
    blob,
    lang,
    history,
    residentId,
    sessionId,
    identityId,
    addressForm,
    handlers,
  );
}

/** @deprecated use processCompanionVoiceTurn */
export const processFennaVoiceTurn = processCompanionVoiceTurn;

export { CompanionApiError };

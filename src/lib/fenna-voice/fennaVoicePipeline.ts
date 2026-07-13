import { blobToBase64 } from "@/lib/fenna-voice/playback";
import { getCompanionVoiceAbortSignal } from "@/lib/fenna-voice/sessionControl";
import { voiceLog } from "@/lib/fenna-voice/voiceLogger";
import {
  CompanionApiError,
  parseApiErrorResponse,
} from "@/lib/http/companionApiError";
import { retryFetch } from "@/lib/http/retryFetch";
import type { AppLang, FennaMessage } from "@/lib/hartmaatje-api/client";
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

async function nextJsTurn(
  blob: Blob,
  lang: AppLang,
  history: FennaMessage[],
  residentId: string,
  sessionId: string | null,
  identityId: VoiceIdentityId = "fenna",
  addressForm: "formeel" | "informeel" = "formeel",
): Promise<VoiceTurnResult> {
  voiceLog("one-shot voice turn → /api/fenna-voice-turn", {
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
    const res = await retryFetch(
      "/api/fenna-voice-turn",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio_base64: base64,
          mime_type: blob.type || "audio/webm",
          lang,
          history: history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
          resident_id: residentId,
          session_id: sessionId ?? undefined,
          identity_id: identityId,
          address_form: addressForm,
        }),
        signal: timeoutController.signal,
      },
      { signal: timeoutController.signal, maxAttempts: 3 },
    );

    const data = (await res.json()) as {
      userText?: string;
      user_text?: string;
      reply?: string;
      audioBase64?: string;
      audio_base64?: string;
      mimeType?: string;
      mime_type?: string;
      timings_ms?: Record<string, number>;
      error?: string;
      quotaExceeded?: boolean;
      resetHint?: string;
    };

    if (!res.ok) {
      if (res.status === 0 || getCompanionVoiceAbortSignal()?.aborted) {
        throw new Error("SESSION_ENDED");
      }
      throw parseApiErrorResponse(
        res,
        data as Record<string, unknown>,
        lang === "en" ? "Speech failed." : "Spraak mislukt.",
      );
    }

    const userText = (data.userText ?? data.user_text ?? "").trim();
    const reply = (data.reply ?? "").trim();

    voiceLog("STT result", { text: userText });
    voiceLog("LLM reply", { text: reply, chars: reply.length });
    voiceLog("turn transcript", { user: userText, assistant: reply });
    voiceLog("text ready", { timings_ms: data.timings_ms });

    return {
      userText,
      reply,
      source: "next",
      timings_ms: data.timings_ms,
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
): Promise<VoiceTurnResult> {
  return nextJsTurn(blob, lang, history, residentId, sessionId, identityId, addressForm);
}

/** @deprecated use processCompanionVoiceTurn */
export const processFennaVoiceTurn = processCompanionVoiceTurn;

export { CompanionApiError };


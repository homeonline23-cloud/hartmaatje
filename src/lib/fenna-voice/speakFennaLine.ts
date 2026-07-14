import type { AppLang } from "@/lib/hartmaatje-api/client";
import {
  hartmaatjeApi,
  isBackendSessionId,
  toBackendLang,
} from "@/lib/hartmaatje-api/client";
import {
  CompanionApiError,
  parseApiErrorResponse,
} from "@/lib/http/companionApiError";
import { retryFetch } from "@/lib/http/retryFetch";
import { isGeminiQuotaError } from "@/lib/geminiErrors";
import { splitForFastSpeech } from "@/lib/fenna-voice/splitSpeech";
import { playFennaAudio } from "@/lib/fenna-voice/playback";
import {
  getCompanionVoiceAbortSignal,
  isCompanionVoiceSessionActive,
} from "@/lib/fenna-voice/sessionControl";
import { voiceLog } from "@/lib/fenna-voice/voiceLogger";
import {
  getGeminiPlaybackRate,
} from "@/lib/voice/geminiVoiceConfig";
import { speakWithBrowserAndWait } from "@/lib/voice/providers/browserProvider";
import type { VoiceIdentityId } from "@/lib/voice/types";

export type CompanionSpeechClip = {
  audioBase64: string;
  mimeType: string;
};

/** @deprecated use CompanionSpeechClip */
export type FennaSpeechClip = CompanionSpeechClip;

function playBrowserSpeech(
  text: string,
  lang: AppLang,
  identityId: VoiceIdentityId,
): Promise<void> {
  const locale = lang === "en" ? "en-US" : "nl-NL";
  return speakWithBrowserAndWait(
    text,
    identityId,
    getGeminiPlaybackRate(identityId),
    locale,
  );
}

export async function fetchCompanionSpeech(
  text: string,
  lang: AppLang,
  identityId: VoiceIdentityId = "fenna",
  sessionGeneration?: number,
  sessionId?: string | null,
): Promise<CompanionSpeechClip> {
  const cleaned = text.trim();
  if (!cleaned) {
    throw new Error("Geen tekst om voor te lezen.");
  }

  if (isBackendSessionId(sessionId)) {
    voiceLog("TTS prefetch (backend /speech/speak)", {
      sessionId,
      chars: cleaned.length,
      preview: cleaned.slice(0, 80),
    });
    try {
      const data = await hartmaatjeApi.speak(sessionId, cleaned, lang);
      if (data.audio_base64) {
        return {
          audioBase64: data.audio_base64,
          mimeType: data.mime_type ?? "audio/mp3",
        };
      }
    } catch (err) {
      voiceLog("backend TTS failed — fallback to Next.js", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  voiceLog("TTS prefetch (/api/companion-speak)", {
    identityId,
    chars: cleaned.length,
    preview: cleaned.slice(0, 80),
  });

  const res = await retryFetch(
    "/api/companion-speak",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleaned, identityId, lang: toBackendLang(lang) }),
      signal: getCompanionVoiceAbortSignal(),
    },
    { maxAttempts: 3, signal: getCompanionVoiceAbortSignal() ?? undefined },
  );
  const data = (await res.json()) as {
    audioBase64?: string;
    mimeType?: string;
    error?: string;
    quotaExceeded?: boolean;
    resetHint?: string;
    retryAfterMs?: number;
  };
  if (res.ok && data.audioBase64) {
    return {
      audioBase64: data.audioBase64,
      mimeType: data.mimeType ?? "audio/mp3",
    };
  }
  if (
    sessionGeneration !== undefined &&
    !isCompanionVoiceSessionActive(sessionGeneration)
  ) {
    throw new Error("SESSION_ENDED");
  }
  const apiErr = parseApiErrorResponse(
    res,
    data as Record<string, unknown>,
    "Spraak mislukt",
  );
  if (apiErr.meta.quotaExceeded) {
    (apiErr as Error & { quotaExceeded?: boolean }).quotaExceeded = true;
  }
  throw apiErr;
}

/** @deprecated use fetchCompanionSpeech */
export const fetchFennaSpeech = fetchCompanionSpeech;

async function playGeminiSpeech(
  text: string,
  lang: AppLang,
  identityId: VoiceIdentityId,
  sessionGeneration?: number,
  sessionId?: string | null,
): Promise<void> {
  if (
    sessionGeneration !== undefined &&
    !isCompanionVoiceSessionActive(sessionGeneration)
  ) {
    return;
  }

  const playbackRate = getGeminiPlaybackRate(identityId);
  const { first, rest } = splitForFastSpeech(text);
  const firstPromise = fetchCompanionSpeech(
    first,
    lang,
    identityId,
    sessionGeneration,
    sessionId,
  );
  const restPromise = rest
    ? fetchCompanionSpeech(rest, lang, identityId, sessionGeneration, sessionId).catch(
        () => null,
      )
    : null;

  const firstClip = await firstPromise;
  if (
    sessionGeneration !== undefined &&
    !isCompanionVoiceSessionActive(sessionGeneration)
  ) {
    return;
  }
  await playFennaAudio(
    firstClip.audioBase64,
    firstClip.mimeType,
    playbackRate,
    () =>
      sessionGeneration === undefined ||
      isCompanionVoiceSessionActive(sessionGeneration),
  );

  if (restPromise) {
    const restClip = await restPromise;
    if (
      !restClip ||
      (sessionGeneration !== undefined &&
        !isCompanionVoiceSessionActive(sessionGeneration))
    ) {
      return;
    }
    await playFennaAudio(
      restClip.audioBase64,
      restClip.mimeType,
      playbackRate,
      () =>
        sessionGeneration === undefined ||
        isCompanionVoiceSessionActive(sessionGeneration),
    );
  }
}

/** Alleen Gemini TTS in productie — in development browser-fallback bij quota. */
const GEMINI_TTS_ONLY =
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_VOICE_GEMINI_ONLY !== "false";

export function isTtsQuotaFailure(err: unknown): boolean {
  if (err instanceof CompanionApiError) return Boolean(err.meta.quotaExceeded);
  if (!(err instanceof Error)) return false;
  if (isGeminiQuotaError(err.message)) return true;
  return Boolean((err as Error & { quotaExceeded?: boolean }).quotaExceeded);
}

export function getTtsErrorMessage(err: unknown): string {
  if (err instanceof CompanionApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Spraak mislukt";
}

function isGeminiKeyMissingError(message: string): boolean {
  return /GEMINI_API_KEY ontbreekt/i.test(message);
}

/** Gemini TTS — standaard geen browser-fallback. */
export async function playCompanionReply(
  text: string,
  lang: AppLang,
  identityId: VoiceIdentityId = "fenna",
  sessionGeneration?: number,
  sessionId?: string | null,
): Promise<void> {
  const cleaned = text.trim();
  if (!cleaned) return;

  if (
    sessionGeneration !== undefined &&
    !isCompanionVoiceSessionActive(sessionGeneration)
  ) {
    return;
  }

  try {
    await playGeminiSpeech(cleaned, lang, identityId, sessionGeneration, sessionId);
  } catch (err) {
    if (
      sessionGeneration !== undefined &&
      !isCompanionVoiceSessionActive(sessionGeneration)
    ) {
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    if (message === "SESSION_ENDED") return;
    const quota =
      isGeminiQuotaError(message) ||
      Boolean((err as Error & { quotaExceeded?: boolean }).quotaExceeded);
    const keyMissing = isGeminiKeyMissingError(message);

    if (!GEMINI_TTS_ONLY && (quota || keyMissing)) {
      voiceLog(
        keyMissing
          ? "TTS no API key — trying browser female voice"
          : "TTS quota — trying browser female voice",
        { identityId },
      );
      try {
        await playBrowserSpeech(cleaned, lang, identityId);
      } catch {
        throw err;
      }
      return;
    }
    throw err;
  }
}

/** @deprecated use playCompanionReply */
export const playFennaReply = playCompanionReply;

export async function speakCompanionLine(
  text: string,
  lang: AppLang,
  identityId: VoiceIdentityId = "fenna",
  sessionGeneration?: number,
  sessionId?: string | null,
): Promise<void> {
  await playCompanionReply(text, lang, identityId, sessionGeneration, sessionId);
}

/** @deprecated use speakCompanionLine */
export const speakFennaLine = speakCompanionLine;

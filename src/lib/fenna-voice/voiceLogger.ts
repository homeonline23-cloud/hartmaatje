import type { AppLang } from "@/lib/languages";
import type { VoiceIdentityId } from "@/lib/voice/types";

/** Console logs for Fenna voice pipeline debugging (browser devtools). */

export function voiceLog(stage: string, detail?: Record<string, unknown>): void {
  if (detail) {
    console.info(`[Fenna voice] ${stage}`, detail);
  } else {
    console.info(`[Fenna voice] ${stage}`);
  }
}

function devTranscriptEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

/** Dev only: mirror UI lines to server transcript log for Cursor/agent review. */
export function logVoiceTranscriptLine(input: {
  identityId: VoiceIdentityId;
  lang: AppLang;
  role: "user" | "assistant";
  text: string;
  sessionId?: string | null;
}): void {
  if (!devTranscriptEnabled()) return;
  const text = input.text.trim();
  if (!text) return;

  voiceLog(`transcript ${input.role}`, { text });

  void fetch("/api/dev/voice-transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity_id: input.identityId,
      lang: input.lang,
      session_id: input.sessionId ?? undefined,
      role: input.role,
      text,
    }),
  }).catch(() => {});
}

import { appendFile, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { AppLang } from "@/lib/languages";
import type { VoiceIdentityId } from "@/lib/voice/types";

const LOG_DIR = path.join(process.cwd(), ".dev");
const LOG_FILE = path.join(LOG_DIR, "voice-transcript.jsonl");

export type VoiceTranscriptEntry = {
  ts: string;
  kind: "turn" | "line";
  identityId: VoiceIdentityId;
  lang: AppLang;
  sessionId?: string;
  role?: "user" | "assistant";
  text?: string;
  userText?: string;
  reply?: string;
  path?: "live" | "llm";
  timings_ms?: Record<string, number>;
};

export function isVoiceTranscriptLogEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.VOICE_TRANSCRIPT_LOG === "1"
  );
}

export function getVoiceTranscriptLogPath(): string {
  return LOG_FILE;
}

export async function appendVoiceTranscript(
  entry: Omit<VoiceTranscriptEntry, "ts">,
): Promise<void> {
  if (!isVoiceTranscriptLogEnabled()) return;
  try {
    await mkdir(LOG_DIR, { recursive: true });
    const line = `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`;
    await appendFile(LOG_FILE, line, "utf8");
  } catch (error) {
    console.warn("[voice-transcript-log] write failed", error);
  }
}

export async function readRecentVoiceTranscripts(
  limit = 100,
): Promise<VoiceTranscriptEntry[]> {
  if (!isVoiceTranscriptLogEnabled()) return [];
  try {
    const raw = await readFile(LOG_FILE, "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    return lines
      .slice(-limit)
      .map((line) => JSON.parse(line) as VoiceTranscriptEntry);
  } catch {
    return [];
  }
}

/** Wis het volledige dev-transcript — handig tussen testsessies. */
export async function clearVoiceTranscriptLog(): Promise<void> {
  if (!isVoiceTranscriptLogEnabled()) return;
  try {
    await mkdir(LOG_DIR, { recursive: true });
    await writeFile(LOG_FILE, "", "utf8");
  } catch (error) {
    console.warn("[voice-transcript-log] clear failed", error);
  }
}

import {
  buildCompanionVoicePrompt,
  getInitiativeHint,
} from "@/lib/companion/conversationLogic";
import type { AppLang } from "@/lib/languages";
import { buildMemoryContextAsync } from "@/lib/memory/orchestrator";
import { geminiGenerateText, type GeminiTurn } from "@/lib/server/gemini";
import { getVoiceTimeContext } from "@/lib/server/timeContext";
import type { VoiceIdentityId } from "@/lib/voice/types";

function cleanLine(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

/** Gentle opener when the user has been quiet — all four companions. */
export async function generateCompanionInitiative(input: {
  residentId: string;
  identityId: VoiceIdentityId;
  lang: AppLang;
  sessionId?: string;
}): Promise<string> {
  const memory = await buildMemoryContextAsync({
    residentId: input.residentId || "guest",
    lang: input.lang,
    sessionId: input.sessionId,
  });

  const systemPrompt = buildCompanionVoicePrompt({
    identityId: input.identityId,
    lang: input.lang,
    memoryBlock: memory.promptBlock,
    extraHints: [getVoiceTimeContext(input.lang), getInitiativeHint(input.lang)],
  });

  const userCue =
    input.lang === "en"
      ? "[Companion initiative: user has been quiet. One warm sentence + one open question.]"
      : "[Companion-initiatief: gebruiker was stil. Eén warme zin + één open vraag.]";

  const turns: GeminiTurn[] = [{ role: "user", text: userCue }];
  const raw = await geminiGenerateText(systemPrompt, turns, {
    temperature: 0.9,
    maxOutputTokens: 120,
  });

  if (raw?.trim()) return cleanLine(raw);

  return input.lang === "en"
    ? "I'm still here — shall we talk about something from your day, or from earlier times?"
    : "Ik ben er nog — zullen we het hebben over uw dag, of over vroeger?";
}

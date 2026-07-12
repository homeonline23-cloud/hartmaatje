import type { AppLang } from "@/lib/languages";
import type { VoiceIdentityId } from "@/lib/voice/types";
import { getVoiceIdentity } from "@/lib/voice/registry";
import fennaNl from "@/lib/liveavatar/contexts/fenna-nl.json";
import {
  buildCompanionChatPrompt,
  buildCompanionVoicePrompt,
  getConversationAgentRules,
  getTurnContextHints,
} from "@/lib/companion/conversationLogic";
import { getVoiceTimeContext } from "@/lib/server/timeContext";

export function getCompanionSystemPrompt(
  identityId: VoiceIdentityId,
  lang: AppLang,
  memoryBlock = "",
): string {
  const base =
    identityId === "fenna" && lang === "nl" && fennaNl.prompt
      ? fennaNl.prompt
      : undefined;

  return buildCompanionChatPrompt({
    identityId,
    lang,
    memoryBlock,
    basePrompt: base,
  });
}

/** Voice prompt — Fenna, Maarten, Peter, Colette (same companion-agent logic). */
export function getVoiceSystemPrompt(
  identityId: VoiceIdentityId,
  lang: AppLang,
  memoryBlock = "",
  extraHints: string[] = [],
): string {
  return buildCompanionVoicePrompt({
    identityId,
    lang,
    memoryBlock,
    extraHints: [getVoiceTimeContext(lang), ...extraHints],
  });
}

export function getExtraTurnHints(
  userText: string,
  lang: AppLang,
  identityId: VoiceIdentityId = "fenna",
): string[] {
  return getTurnContextHints(userText, identityId, lang);
}

export function getCompanionDisplayName(identityId: VoiceIdentityId): string {
  return getVoiceIdentity(identityId).displayName;
}

/** @deprecated use getConversationAgentRules via buildCompanionChatPrompt */
export { getConversationAgentRules };

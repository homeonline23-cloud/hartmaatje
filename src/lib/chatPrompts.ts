import type { AppLang } from "@/lib/languages";
import type { VoiceIdentityId } from "@/lib/voice/types";
import { getVoiceIdentity } from "@/lib/voice/registry";
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
  return buildCompanionChatPrompt({
    identityId,
    lang,
    memoryBlock,
  });
}

/** Voice prompt — Fenna, Maarten, Peter, Colette (same companion-agent logic). */
export function getVoiceSystemPrompt(
  identityId: VoiceIdentityId,
  lang: AppLang,
  memoryBlock = "",
  extraHints: string[] = [],
  addressForm: "formeel" | "informeel" = "formeel",
): string {
  return buildCompanionVoicePrompt({
    identityId,
    lang,
    memoryBlock,
    extraHints: [getVoiceTimeContext(lang), ...extraHints],
    addressForm,
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

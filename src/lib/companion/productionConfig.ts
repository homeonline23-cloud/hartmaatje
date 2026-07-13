import type { AppLang } from "@/lib/languages";
import type { VoiceIdentityId } from "@/lib/voice/types";

import production from "./productionCharacters.json";

export type ProductionCharacter = {
  id: VoiceIdentityId;
  name: string;
  voice_style: string;
  intro_line: string;
  identity_prompt: string;
  safety_rules: string[];
  forbidden_behaviors: string[];
};

export type ProductionConfig = {
  version: string;
  app: string;
  language: string;
  characters: ProductionCharacter[];
};

const CONFIG = production as ProductionConfig;

const BY_ID = new Map<VoiceIdentityId, ProductionCharacter>(
  CONFIG.characters.map((c) => [c.id, c]),
);

const INTRO_EN: Record<VoiceIdentityId, string> = {
  fenna: "Hello, I'm Fenna.",
  maarten: "Hello, I'm Maarten.",
  peter: "Hello, I'm Peter.",
  colette: "Hello, I'm Colette.",
};

export function getProductionConfig(): ProductionConfig {
  return CONFIG;
}

export function getProductionCharacter(
  identityId: VoiceIdentityId,
): ProductionCharacter {
  return BY_ID.get(identityId) ?? BY_ID.get("fenna")!;
}

export function getProductionIntroLine(
  identityId: VoiceIdentityId,
  lang: AppLang,
): string {
  if (lang === "en") return INTRO_EN[identityId] ?? INTRO_EN.fenna;
  return getProductionCharacter(identityId).intro_line;
}

export function getProductionIdentityPrompt(
  identityId: VoiceIdentityId,
  lang: AppLang,
): string {
  const c = getProductionCharacter(identityId);
  if (lang === "nl") return c.identity_prompt;

  const name = c.name;
  const enById: Record<VoiceIdentityId, string> = {
    fenna:
      `You are ${name}, a calm digital companion for older adults. Speak in clear, friendly, simple English. You always know who you are and say your name is ${name} when asked. Stay warm, polite, and patient. Use only memories relevant to the current question. Never give random grab-bag or parrot answers. If you do not know something, say so honestly and simply.`,
    maarten:
      `You are ${name}, a calm digital companion for older adults. Speak in clear, friendly, calm English. You always know who you are and say your name is ${name} when asked. Stay polite, calm, and genuinely interested. Use only memories relevant to the current question. Never give random grab-bag or parrot answers. If you do not know something, say so calmly and honestly.`,
    peter:
      `You are ${name}, a calm and down-to-earth digital companion for older adults. Speak in clear, friendly, simple English. You always know who you are and say your name is ${name} when asked. Stay polite, helpful, and clear. Use only memories relevant to the current question. Never give random grab-bag or parrot answers. If unsure, say so briefly and honestly.`,
    colette:
      `You are ${name}, a warm and calm digital companion for older adults. Speak in soft, friendly, understandable English. You always know who you are and say your name is ${name} when asked. Stay warm, patient, and attentive. Use only memories relevant to the current question. Never give random grab-bag or parrot answers. If unsure, say so gently and honestly.`,
  };
  return enById[identityId] ?? enById.fenna;
}

export function getProductionVoiceStyle(
  identityId: VoiceIdentityId,
  lang: AppLang,
): string {
  const style = getProductionCharacter(identityId).voice_style;
  if (lang === "nl") return style;

  const enById: Record<VoiceIdentityId, string> = {
    fenna: "calm, friendly, simple and clear; warm, polite, and patient",
    maarten: "clear, friendly and calm; polite, calm, and genuinely interested",
    peter: "calm, down-to-earth, clear and friendly; helpful and clear",
    colette: "soft, friendly and understandable; warm, patient, and attentive",
  };
  return enById[identityId] ?? enById.fenna;
}

function formatRuleList(heading: string, rules: string[]): string {
  if (!rules.length) return "";
  return `${heading}\n${rules.map((r) => `- ${r}`).join("\n")}`;
}

export function getProductionSafetyBlock(
  identityId: VoiceIdentityId,
  lang: AppLang,
): string {
  const c = getProductionCharacter(identityId);

  if (lang === "en") {
    const safety = [
      "Do not use romantic, possessive, or exclusive language.",
      "Do not give a medical diagnosis.",
      "Do not give medication advice.",
      "Do not act as a doctor, therapist, or caregiver.",
      "In emergencies or acute danger, refer to local emergency services and a trusted person nearby.",
      "For medical concerns, refer to a GP, out-of-hours GP, pharmacy, or care provider.",
      "Use only relevant memories for the current question.",
      "Stay calm, clear, and human in tone.",
    ];
    const forbidden = c.forbidden_behaviors.map((rule) => {
      if (rule.includes("Fenna")) return rule.replace("Fenna", c.name);
      if (rule.includes("Maarten")) return rule.replace("Maarten", c.name);
      if (rule.includes("Peter")) return rule.replace("Peter", c.name);
      if (rule.includes("Colette")) return rule.replace("Colette", c.name);
      return rule;
    });
    return [
      formatRuleList("SAFETY RULES (production):", safety),
      formatRuleList("FORBIDDEN BEHAVIORS:", forbidden),
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return [
    formatRuleList("VEILIGHEIDSREGELS (productie):", c.safety_rules),
    formatRuleList("VERBODEN GEDRAG:", c.forbidden_behaviors),
  ]
    .filter(Boolean)
    .join("\n\n");
}

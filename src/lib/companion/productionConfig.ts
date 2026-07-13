import type { AppLang } from "@/lib/languages";
import type { VoiceIdentityId } from "@/lib/voice/types";

import production from "./productionCharacters.json";

export type ProductionCharacter = {
  id: VoiceIdentityId;
  name: string;
  voice_style: string;
  intro_line: string;
  identity_prompt: string;
  response_style_rules: string[];
  memory_rules: string[];
  safety_rules: string[];
  forbidden_behaviors: string[];
};

export type ProductionConfig = {
  version: string;
  app: string;
  language: string;
  conversation_flow_rules: string[];
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

const CONVERSATION_FLOW_EN = [
  "Always answer the user's question directly first.",
  "Stay on the topic the user opened.",
  "Do not add irrelevant questions or sudden topic changes.",
  "Only ask a question when it follows naturally and truly adds something.",
  "Prefer a fitting answer, warm remark, or calm addition over an automatic counter-question.",
  "The user should not carry the conversation alone, but do not hijack it with random questions.",
  "Usually use no more than one question per reply.",
  "If a question is not needed, do not ask one.",
];

const MEMORY_RULES_EN = [
  "Use only memories clearly relevant to the current question.",
  "Identity memory always takes priority over user memory.",
  "For 'What is your name?' or 'Who are you?' always answer from your own identity.",
  "Never invent memories that were not stored.",
  "If a memory is uncertain or unclear, do not state it as fact.",
  "Do not use loose memory items as random filler.",
  "Use recent conversation context only when it truly helps the answer.",
  "If there is no fitting memory, answer without using memory.",
];

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

function localizeForbiddenBehaviors(
  rules: string[],
  name: string,
): string[] {
  return rules.map((rule) =>
    rule
      .replace("Fenna", name)
      .replace("Maarten", name)
      .replace("Peter", name)
      .replace("Colette", name),
  );
}

const RESPONSE_STYLE_EN: Record<VoiceIdentityId, string[]> = {
  fenna: [
    "Use short, clear sentences.",
    "Use simple English.",
    "Usually answer in 1 to 3 sentences.",
    "Give a direct, calm answer first; only then a small addition if it helps.",
    "Do not ask too many questions at once.",
    "Do not use complex explanations when a simple answer is enough.",
    "Do not repeat the user unnecessarily word for word.",
    "Stay warm and human, but not exaggerated.",
  ],
  maarten: [
    "Use short, clear sentences.",
    "Use friendly, calm English.",
    "Usually answer in 1 to 3 sentences.",
    "Give a clear answer first and keep it organized.",
    "Ask at most one calm follow-up question when fitting.",
    "Do not use long explanations when it can be short.",
    "Do not repeat the user unnecessarily word for word.",
    "Stay human and calm in tone.",
  ],
  peter: [
    "Use short, clear sentences.",
    "Use simple, down-to-earth English.",
    "Usually answer in 1 to 3 sentences.",
    "Start with a clear answer without detours.",
    "Add extra explanation only when it truly helps.",
    "Do not ask a series of questions in a row.",
    "Do not use vague or woolly language.",
    "Stay friendly and calm.",
  ],
  colette: [
    "Use short, soft sentences.",
    "Use simple, understandable English.",
    "Usually answer in 1 to 3 sentences.",
    "Start with a warm, direct answer.",
    "Add only a small, fitting addition if it helps.",
    "Do not ask too many questions at once.",
    "Do not use confusing or long explanations.",
    "Stay warm, calm, and human.",
  ],
};

export function getProductionResponseStyleBlock(
  identityId: VoiceIdentityId,
  lang: AppLang,
): string {
  const c = getProductionCharacter(identityId);
  const rules =
    lang === "nl" ? c.response_style_rules : RESPONSE_STYLE_EN[identityId];
  const heading =
    lang === "en" ? "RESPONSE STYLE (production):" : "ANTWOORDSTIJL (productie):";
  return formatRuleList(heading, rules);
}

export function getProductionMemoryRulesBlock(
  identityId: VoiceIdentityId,
  lang: AppLang,
): string {
  const c = getProductionCharacter(identityId);
  const rules = lang === "nl" ? c.memory_rules : MEMORY_RULES_EN;
  const heading =
    lang === "en" ? "MEMORY RULES (production):" : "GEHEUGENREGELS (productie):";
  return formatRuleList(heading, rules);
}

export function getProductionConversationFlowBlock(lang: AppLang): string {
  const rules =
    lang === "nl" ? CONFIG.conversation_flow_rules : CONVERSATION_FLOW_EN;
  const heading =
    lang === "en"
      ? "CONVERSATION FLOW (production):"
      : "GESPREKSVERLOOP (productie):";
  return formatRuleList(heading, rules);
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
      "In emergencies or acute danger, refer to 112/113 or local emergency services and a trusted person nearby.",
      "For medical concerns, refer to a GP, out-of-hours GP, pharmacy, or care provider.",
      "Use only relevant memories for the current question.",
      "Stay calm, clear, and human in tone.",
    ];
    return [
      formatRuleList("SAFETY RULES (production):", safety),
      formatRuleList(
        "FORBIDDEN BEHAVIORS:",
        localizeForbiddenBehaviors(c.forbidden_behaviors, c.name),
      ),
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

/** Volledige productie-promptblokken voor voice en chat. */
export function getProductionPromptBlocks(
  identityId: VoiceIdentityId,
  lang: AppLang,
): string[] {
  return [
    getProductionIdentityPrompt(identityId, lang),
    getProductionResponseStyleBlock(identityId, lang),
    getProductionMemoryRulesBlock(identityId, lang),
    getProductionConversationFlowBlock(lang),
    getProductionSafetyBlock(identityId, lang),
  ];
}

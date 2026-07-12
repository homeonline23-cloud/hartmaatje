import type { VoiceIdentity, VoiceIdentityId } from "@/lib/voice/types";

/** Ethische basis — ook zichtbaar in privacy/instellingen. */
export const VOICE_ETHICS_STATEMENT =
  "HartMaatje gebruikt alleen legale, zorgvuldig gekozen stemmen waarvoor gebruik is toegestaan, en kopieert nooit bewust de stem van een echte persoon zonder duidelijke toestemming.";

export const DEFAULT_VOICE_IDENTITY_ID: VoiceIdentityId = "fenna";

const VOICE_BASE = "/voices/identities";

/**
 * Permanente HartMaatje-stemregister.
 * Dezelfde identiteiten (Maarten, Peter, Fenna, Colette) blijven bestaan
 * wanneer later nieuwe taalvarianten worden toegevoegd.
 */
export const HARTMAATJE_VOICE_REGISTRY: readonly VoiceIdentity[] = [
  {
    id: "maarten",
    displayName: "Maarten",
    internalName: "maarten",
    gender: "male",
    defaultSpeed: 0.8,
    personalityStyle: "calm, grounded, steady",
    warmthStyle: "trustworthy and patient",
    uiDescription: "Rustig en stabiel — een vertrouwde mannenstem.",
    active: true,
    futureLanguageVariants: ["nl-NL", "en-US", "de-DE", "fr-FR", "es-ES"],
    variants: [
      {
        locale: "nl-NL",
        sourceFile: `${VOICE_BASE}/maarten/nl-NL/NL-Maarten-man-2.mp3`,
        sourceFileName: "NL-Maarten-man-2.mp3",
        active: true,
        browserVoiceHints: ["maarten", "xander", "male", "man", "nl"],
      },
      {
        locale: "en-US",
        sourceFile: `${VOICE_BASE}/maarten/en-US/US-Maarten-man.mp3`,
        sourceFileName: "US-Maarten-man.mp3",
        active: true,
        browserVoiceHints: ["maarten", "male", "man", "english", "en-us"],
      },
    ],
  },
  {
    id: "peter",
    displayName: "Peter",
    internalName: "peter",
    gender: "male",
    defaultSpeed: 0.86,
    personalityStyle: "warm, grounded, deep baritone",
    warmthStyle: "calm and equal — heavy warm tone",
    uiDescription: "Warm en diep — zware, rustige mannenstem zoals in de video.",
    active: true,
    futureLanguageVariants: ["nl-BE", "nl-NL", "fr-BE", "en-US", "de-DE", "fr-FR"],
    variants: [
      {
        locale: "nl-BE",
        sourceFile: `${VOICE_BASE}/peter/nl-BE/NL-Belgie-Peter-man.mp3`,
        sourceFileName: "NL-Belgie-Peter-man.mp3",
        active: true,
        browserVoiceHints: ["peter", "belg", "male", "man", "nl", "deep", "david"],
      },
      {
        locale: "en-US",
        sourceFile: `${VOICE_BASE}/peter/en-US/US-Peter-man.mp3`,
        sourceFileName: "US-Peter-man.mp3",
        active: true,
        browserVoiceHints: ["peter", "male", "man", "english", "en-us", "deep", "david"],
      },
    ],
  },
  {
    id: "fenna",
    displayName: "Fenna",
    internalName: "fenna",
    gender: "female",
    defaultSpeed: 0.8,
    personalityStyle: "gentle, soft, comforting",
    warmthStyle: "soothing and safe",
    uiDescription: "Zacht en troostend — een fijne vrouwenstem.",
    active: true,
    futureLanguageVariants: ["nl-NL", "en-US", "de-DE", "fr-FR", "es-ES"],
    variants: [
      {
        locale: "nl-NL",
        sourceFile: `${VOICE_BASE}/fenna/nl-NL/NL-Fenna-vrouw-4.mp3`,
        sourceFileName: "NL-Fenna-vrouw-4.mp3",
        active: true,
        browserVoiceHints: ["fenna", "female", "vrouw", "lotte", "nl"],
      },
      {
        locale: "en-US",
        sourceFile: `${VOICE_BASE}/fenna/en-US/US-Fenna-vrouw.mp3`,
        sourceFileName: "US-Fenna-vrouw.mp3",
        active: true,
        browserVoiceHints: ["fenna", "female", "english", "en-us"],
      },
    ],
  },
  {
    id: "colette",
    displayName: "Colette",
    internalName: "colette",
    gender: "female",
    defaultSpeed: 0.8,
    personalityStyle: "clear, warm, confident",
    warmthStyle: "reassuring and steady",
    uiDescription: "Warm en duidelijk — helder en geruststellend.",
    active: true,
    futureLanguageVariants: ["nl-NL", "en-US", "de-DE", "fr-FR", "es-ES"],
    variants: [
      {
        locale: "nl-NL",
        sourceFile: `${VOICE_BASE}/colette/nl-NL/NL-Colette-vrouw-3.mp3`,
        sourceFileName: "NL-Colette-vrouw-3.mp3",
        active: true,
        browserVoiceHints: ["colette", "female", "vrouw", "nl"],
      },
      {
        locale: "en-US",
        sourceFile: `${VOICE_BASE}/colette/en-US/US-Colette-vrouw.mp3`,
        sourceFileName: "US-Colette-vrouw.mp3",
        active: true,
        browserVoiceHints: ["colette", "female", "english", "en-us"],
      },
    ],
  },
] as const;

export function getVoiceIdentity(id: VoiceIdentityId): VoiceIdentity {
  return (
    HARTMAATJE_VOICE_REGISTRY.find((v) => v.id === id) ??
    HARTMAATJE_VOICE_REGISTRY.find((v) => v.id === DEFAULT_VOICE_IDENTITY_ID)!
  );
}

export function getActiveVoiceIdentities(): VoiceIdentity[] {
  return HARTMAATJE_VOICE_REGISTRY.filter((v) => v.active);
}

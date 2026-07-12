import type { AppLang } from "@/lib/languages";
import type { VoiceIdentityId } from "@/lib/voice/types";

export const COMPANION_OPENING: Record<VoiceIdentityId, Record<AppLang, string>> = {
  fenna: {
    nl: "Ik ben Fenna. Waar wilt u het over hebben — of zullen we gewoon even praten?",
    en: "I'm Fenna. What's on your mind — or shall we just chat for a bit?",
  },
  maarten: {
    nl: "Ik ben Maarten. Waar kunt u op dit moment mee — of vertelt u maar waar u aan denkt.",
    en: "I'm Maarten. What's on your mind — or tell me what you're thinking about.",
  },
  peter: {
    nl: "Ik ben Peter. Fijn dat u er bent — waar wilt u het over hebben vandaag?",
    en: "I'm Peter. Good to hear you — what would you like to talk about today?",
  },
  colette: {
    nl: "Ik ben Colette, uw gespreksmaatje. Fijn dat u er bent — ik luister graag.",
    en: "I'm Colette, your conversation partner. Good to hear you — I'm happy to listen.",
  },
};

export function getCompanionOpening(
  identityId: VoiceIdentityId,
  lang: AppLang,
): string {
  return COMPANION_OPENING[identityId]?.[lang] ?? COMPANION_OPENING.fenna[lang];
}

/** Backward compatible alias. */
export const FENNA_OPENING: Record<AppLang, string> = COMPANION_OPENING.fenna;

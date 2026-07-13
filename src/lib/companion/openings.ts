import type { AppLang } from "@/lib/languages";
import type { VoiceIdentityId } from "@/lib/voice/types";
import { getProductionIntroLine } from "@/lib/companion/productionConfig";

/** Productie-openingszinnen — zie productionCharacters.json */
export function getCompanionOpening(
  identityId: VoiceIdentityId,
  lang: AppLang,
): string {
  return getProductionIntroLine(identityId, lang);
}

/** @deprecated Gebruik getCompanionOpening — behouden voor oude imports. */
export const COMPANION_OPENING: Record<
  VoiceIdentityId,
  Record<AppLang, string>
> = {
  fenna: { nl: "Hallo, ik ben Fenna.", en: "Hello, I'm Fenna." },
  maarten: { nl: "Hallo, ik ben Maarten.", en: "Hello, I'm Maarten." },
  peter: { nl: "Hallo, ik ben Peter.", en: "Hello, I'm Peter." },
  colette: { nl: "Hallo, ik ben Colette.", en: "Hello, I'm Colette." },
};

/** Backward compatible alias. */
export const FENNA_OPENING: Record<AppLang, string> = COMPANION_OPENING.fenna;

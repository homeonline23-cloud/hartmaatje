import { getVoiceIdentity } from "@/lib/voice/registry";
import { resolveAppLang, getVoiceLocaleForLang } from "@/lib/languages";
import type {
  VoiceIdentityId,
  VoiceLanguageVariant,
  VoiceLocale,
} from "@/lib/voice/types";

/** Huidige app-taal voor stemkeuze — uit opgeslagen taalvoorkeur. */
export function getAppVoiceLocale(): VoiceLocale {
  return getVoiceLocaleForLang(resolveAppLang());
}

function localePrefix(locale: VoiceLocale): string {
  return locale.split("-")[0]?.toLowerCase() ?? locale.toLowerCase();
}

/**
 * Kies de actieve audio-variant voor een identiteit en locale.
 * Valt terug op de dichtstbijzijnde taal binnen dezelfde identiteit.
 */
export function resolveActiveVariant(
  identityId: VoiceIdentityId,
  preferredLocale: VoiceLocale = getAppVoiceLocale(),
): VoiceLanguageVariant | null {
  const identity = getVoiceIdentity(identityId);
  const active = identity.variants.filter((v) => v.active);
  if (!active.length) return null;

  const exact = active.find(
    (v) => v.locale.toLowerCase() === preferredLocale.toLowerCase(),
  );
  if (exact) return exact;

  const prefix = localePrefix(preferredLocale);
  const sameLanguage = active.find(
    (v) => localePrefix(v.locale) === prefix,
  );
  if (sameLanguage) return sameLanguage;

  return active[0] ?? null;
}

/** Unieke variant-sleutel voor logging en toekomstige TTS-providers. */
export function variantKey(
  identityId: VoiceIdentityId,
  locale: VoiceLocale,
): string {
  return `${identityId}.${locale}`;
}

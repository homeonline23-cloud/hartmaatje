/** Permanente HartMaatje-stemidentiteiten — stabiel over talen en versies heen. */
export type VoiceIdentityId = "maarten" | "peter" | "fenna" | "colette";

/** BCP-47 locale, bijv. nl-NL, en-US. */
export type VoiceLocale = string;

export type VoiceGender = "male" | "female";

/** Eén taalvariant van een stemidentiteit (audio + playback-config). */
export type VoiceLanguageVariant = {
  locale: VoiceLocale;
  /** Pad onder /public, bijv. /voices/identities/fenna/nl-NL/NL-Fenna-vrouw-4.mp3 */
  sourceFile: string;
  /** Originele bestandsnaam — alleen voor onderhoud. */
  sourceFileName: string;
  active: boolean;
  /** Hints voor browser-TTS fallback tot cloud-TTS per identiteit beschikbaar is. */
  browserVoiceHints: readonly string[];
};

/** Permanente HartMaatje-stem — zichtbare naam blijft gelijk in elke taal. */
export type VoiceIdentity = {
  id: VoiceIdentityId;
  displayName: string;
  internalName: string;
  gender: VoiceGender;
  defaultSpeed: number;
  personalityStyle: string;
  warmthStyle: string;
  /** Warme uitleg voor ouderen in de instellingen. */
  uiDescription: string;
  active: boolean;
  /** Geplande locales — audio kan later per locale worden toegevoegd. */
  futureLanguageVariants: readonly VoiceLocale[];
  variants: readonly VoiceLanguageVariant[];
};

export type VoiceSpeedOption = {
  rate: number;
  label: string;
};

/** Opgeslagen voorkeuren per gebruiker (profiel of lokaal). */
export type VoiceUserSettings = {
  identityId: VoiceIdentityId;
  playbackRate: number;
};

export type VoicePlaybackRequest = {
  text: string;
  settings: VoiceUserSettings;
};

/** @deprecated Gebruik VoiceIdentityId. */
export type VoiceProfileId = VoiceIdentityId;

/** @deprecated Gebruik VoiceIdentity. */
export type VoiceProfile = {
  id: VoiceIdentityId;
  label: string;
  description: string;
  gender: VoiceGender;
};

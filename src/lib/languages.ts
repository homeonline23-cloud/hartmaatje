/** Ondersteunde UI-talen — later uitbreidbaar (de, fr, es, …). */
export type AppLang = "nl" | "en";

export type LanguageOption = {
  id: AppLang;
  /** Naam in de eigen taal. */
  nativeLabel: string;
  /** BCP-47 locale voor stem-audio. */
  voiceLocale: string;
};

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
  { id: "nl", nativeLabel: "Nederlands", voiceLocale: "nl-NL" },
  { id: "en", nativeLabel: "English", voiceLocale: "en-US" },
] as const;

export const DEFAULT_APP_LANG: AppLang = "nl";

const STORAGE_KEY = "hartmaatje_lang";
export const LANG_COOKIE_NAME = STORAGE_KEY;

export function isAppLang(value: string): value is AppLang {
  return SUPPORTED_LANGUAGES.some((l) => l.id === value);
}

export function getVoiceLocaleForLang(lang: AppLang): string {
  return (
    SUPPORTED_LANGUAGES.find((l) => l.id === lang)?.voiceLocale ?? "nl-NL"
  );
}

export function loadSavedAppLang(): AppLang | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && isAppLang(raw)) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveAppLang(lang: AppLang): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
    document.cookie = `${LANG_COOKIE_NAME}=${lang};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function parseAppLang(value: string | null | undefined): AppLang | null {
  if (value && isAppLang(value)) return value;
  return null;
}

export function detectBrowserAppLang(): AppLang {
  if (typeof navigator === "undefined") return DEFAULT_APP_LANG;
  const locale = navigator.language?.toLowerCase() ?? "";
  if (locale.startsWith("en")) return "en";
  return "nl";
}

export function resolveAppLang(): AppLang {
  return loadSavedAppLang() ?? detectBrowserAppLang();
}

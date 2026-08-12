/**
 * Multilingual config — fase 1 launch languages.
 * Structure is ready for additional languages/regions later.
 */

export const APP_LANGS = ["nl", "en", "de", "fr", "es"] as const;
export type AppLang = (typeof APP_LANGS)[number];

export const DEFAULT_APP_LANG: AppLang = "nl";

export const LANG_STORAGE_KEY = "hartmaatje_lang";

export type LocaleMeta = {
  id: AppLang;
  /** BCP-47 for HTML lang / API locale */
  bcp47: string;
  /** Native label shown in the switcher */
  nativeLabel: string;
  /** Short button label */
  shortLabel: string;
  dir: "ltr" | "rtl";
};

export const LOCALES: Record<AppLang, LocaleMeta> = {
  nl: {
    id: "nl",
    bcp47: "nl-NL",
    nativeLabel: "Nederlands",
    shortLabel: "NL",
    dir: "ltr",
  },
  en: {
    id: "en",
    bcp47: "en-GB",
    nativeLabel: "English",
    shortLabel: "EN",
    dir: "ltr",
  },
  de: {
    id: "de",
    bcp47: "de-DE",
    nativeLabel: "Deutsch",
    shortLabel: "DE",
    dir: "ltr",
  },
  fr: {
    id: "fr",
    bcp47: "fr-FR",
    nativeLabel: "Français",
    shortLabel: "FR",
    dir: "ltr",
  },
  es: {
    id: "es",
    bcp47: "es-ES",
    nativeLabel: "Español",
    shortLabel: "ES",
    dir: "ltr",
  },
};

export function isAppLang(value: string | null | undefined): value is AppLang {
  return (
    value === "nl" ||
    value === "en" ||
    value === "de" ||
    value === "fr" ||
    value === "es"
  );
}

export function toBcp47(lang: AppLang): string {
  return LOCALES[lang].bcp47;
}

export function fromBcp47(locale: string | null | undefined): AppLang {
  if (!locale) return DEFAULT_APP_LANG;
  const lower = locale.toLowerCase();
  if (lower.startsWith("en")) return "en";
  if (lower.startsWith("nl")) return "nl";
  if (lower.startsWith("de")) return "de";
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("es") || lower.startsWith("an")) return "es";
  return DEFAULT_APP_LANG;
}

export function detectBrowserAppLang(): AppLang {
  if (typeof navigator === "undefined") return DEFAULT_APP_LANG;
  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean);
  for (const c of candidates) {
    const lower = c.toLowerCase();
    if (lower.startsWith("en")) return "en";
    if (lower.startsWith("nl")) return "nl";
    if (lower.startsWith("de")) return "de";
    if (lower.startsWith("fr")) return "fr";
    if (lower.startsWith("es")) return "es";
  }
  return DEFAULT_APP_LANG;
}

import type { AppLang } from "@/i18n/config";

export type PrivacyContent = {
  title: string;
  updated: string;
};

/** Privacy page is now video-only for every language (B2B demo feature). */
const nl: PrivacyContent = {
  title: "Privacy",
  updated: "Laatst bijgewerkt: 3 augustus 2026",
};

const en: PrivacyContent = {
  title: "Privacy Policy",
  updated: "Last updated: 3 August 2026",
};

const de: PrivacyContent = {
  title: "Privacy",
  updated: "Zuletzt aktualisiert: 3. August 2026",
};

const fr: PrivacyContent = {
  title: "Privacy",
  updated: "Dernière mise à jour : 3 août 2026",
};

const es: PrivacyContent = {
  title: "Privacy",
  updated: "Última actualización: 3 de agosto de 2026",
};

export function getPrivacyContent(lang: AppLang): PrivacyContent {
  if (lang === "nl") return nl;
  if (lang === "de") return de;
  if (lang === "fr") return fr;
  if (lang === "es") return es;
  return en;
}

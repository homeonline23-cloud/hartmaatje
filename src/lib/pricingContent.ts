import type { AppLang } from "@/i18n/config";

export type PricingContent = {
  title: string;
};

/** Business & Growth page is now video-led (business info + future growth video). */
const nl: PricingContent = {
  title: "Bedrijfsinformatie en Toekomstige Groei.",
};

const en: PricingContent = {
  title: "Business Information and Future Growth.",
};

const de: PricingContent = {
  title: "Geschäftsinformationen und zukünftiges Wachstum.",
};

const fr: PricingContent = {
  title: "Informations sur l'entreprise et croissance future.",
};

const es: PricingContent = {
  title: "Información empresarial y crecimiento futuro.",
};

const byLang: Record<AppLang, PricingContent> = {
  nl,
  en,
  de,
  fr,
  es,
};

export function getPricingContent(lang: AppLang): PricingContent {
  return byLang[lang] ?? en;
}

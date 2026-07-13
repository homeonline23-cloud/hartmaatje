/**
 * Vul het maandbedrag in zodra het vaststaat (bijv. "29,95").
 * Laat null zolang de prijs nog niet gepubliceerd is.
 */
export const HARTMAATJE_MONTHLY_PRICE_EUR: string | null = null;

export function formatMonthlyPriceDisplay(
  amount: string | null,
  lang: "nl" | "en" | "de" | "fr" | "es",
): string | null {
  if (!amount?.trim()) return null;
  const normalized = amount.trim().replace(".", ",");
  return lang === "nl" ? `€ ${normalized}` : `€${normalized}`;
}

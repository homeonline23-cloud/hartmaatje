import type { AppLang } from "@/lib/languages";

/** Short hint so Fenna does not guess the wrong time-of-day greeting. */
export function getVoiceTimeContext(lang: AppLang): string {
  if (lang === "en") {
    return (
      "Greetings: do not say good morning, good afternoon, or good evening unless the user did. " +
      "For a simple hello, reply with hello or answer their point — no time-of-day guess."
    );
  }

  return (
    "Begroeting: zeg geen goedemorgen, goedemiddag of goede avond tenzij de gebruiker dat zelf zei. " +
    "Bij hallo of goedendag: antwoord met hallo of goedendag, of ga direct inhoudelijk in — niet de dagdeel-groet raden."
  );
}

import type { AppLang } from "@/lib/languages";

export type RateLimitMeta = {
  quotaExceeded?: boolean;
  retryAfterMs?: number;
  resetAt?: string | null;
  resetHint?: string;
};

/** Volgende middernacht Pacific Time — gangbare reset voor gratis Gemini-dagquota. */
export function nextPacificMidnightUtc(): Date {
  const now = new Date();
  const ptParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const g = (t: string) =>
    Number(ptParts.find((p) => p.type === t)?.value ?? 0);
  const secondsToday = g("hour") * 3600 + g("minute") * 60 + g("second");
  const secondsUntilMidnight = Math.max(1, 86400 - secondsToday);
  return new Date(now.getTime() + secondsUntilMidnight * 1000);
}

export function formatResetHint(resetAt: Date, lang: AppLang): string {
  const local = resetAt.toLocaleString(lang === "en" ? "en-GB" : "nl-NL", {
    timeZone: "Europe/Amsterdam",
    dateStyle: "short",
    timeStyle: "short",
  });
  return lang === "en"
    ? `Voice may work again around ${local}.`
    : `Stem werkt waarschijnlijk weer rond ${local}.`;
}

export function buildRateLimitMeta(
  lang: AppLang,
  dailyQuota: boolean,
): RateLimitMeta {
  if (dailyQuota) {
    const resetAt = nextPacificMidnightUtc();
    const retryAfterMs = Math.max(0, resetAt.getTime() - Date.now());
    return {
      quotaExceeded: true,
      retryAfterMs,
      resetAt: resetAt.toISOString(),
      resetHint: formatResetHint(resetAt, lang),
    };
  }
  return {
    quotaExceeded: false,
    retryAfterMs: 45_000,
    resetAt: null,
    resetHint:
      lang === "en"
        ? "Try again in about a minute."
        : "Probeer het over ongeveer een minuut opnieuw.",
  };
}

export function isGeminiQuotaError(text: string): boolean {
  const m = text.toLowerCase();
  return (
    m.includes("429") ||
    m.includes("resource_exhausted") ||
    m.includes("quota") ||
    m.includes("exceeded your current quota")
  );
}

export function isApiErrorPayload(text: string): boolean {
  const t = text.trim();
  return (
    isGeminiQuotaError(t) ||
    (t.startsWith("{") && t.includes('"error"') && t.includes('"code"'))
  );
}

export function friendlyGeminiQuotaMessage(
  companionName: string,
  lang: AppLang,
  resetHint?: string,
): string {
  const base =
    lang === "en"
      ? `${companionName}'s voice is paused for today — the free daily speech limit is full. You can keep chatting; replies appear on screen.`
      : `${companionName}'s stem is vandaag even op — het gratis daglimiet voor spraak is vol. U kunt gewoon doorpraten; antwoorden verschijnen op het scherm.`;
  return resetHint ? `${base} ${resetHint}` : base;
}

export function friendlyGeminiErrorMessage(
  raw: string,
  lang: AppLang,
  companionName = "Fenna",
  resetHint?: string,
): string {
  if (isGeminiQuotaError(raw)) {
    return friendlyGeminiQuotaMessage(companionName, lang, resetHint);
  }
  if (raw.length > 160 || isApiErrorPayload(raw)) {
    return lang === "en"
      ? "The speech service had a problem. Please try again in a moment."
      : "De spraakservice had even een probleem. Probeer het zo nog eens.";
  }
  return raw;
}

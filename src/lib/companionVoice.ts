/**
 * HartMaatje gespreksprincipes — gebaseerd op onderzoek naar conversational
 * companion robots voor ouderen (Irfan, Kuoppamäki & Skantze, 2024, Front. Robot. AI).
 * Spreektempo standaard ~80% — zie DEFAULT_TTS_PLAYBACK_RATE in constants.ts.
 */

/** Korte NL-regels voor warme, actieve luister-stijl (max ~2 zinnen per antwoord). */
export const COMPANION_REPLY_MAX_SENTENCES = 2;

export function trimCompanionReply(text: string): string {
  const parts = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= COMPANION_REPLY_MAX_SENTENCES) return text.trim();
  return parts.slice(0, COMPANION_REPLY_MAX_SENTENCES).join(" ");
}

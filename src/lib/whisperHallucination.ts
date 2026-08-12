/**
 * Hard STT filter for Realtime transcription.completed events.
 * Match → ignore event completely — never trigger a companion reply.
 */

const HARD_BLOCK_SUBSTRINGS = [
  "Amara",
  "Ondertiteld",
  "TV Gelderland",
  "dankjewel voor het kijken",
] as const;

const HALLUCINATION_PATTERNS: RegExp[] = [
  /amara/i,
  /amara\.?\s*org/i,
  /ondertiteld/i,
  /ondertiteling/i,
  /gelderland/i,
  /tv\s*gelderland/i,
  /dankjewel\s+voor\s+het\s+kijken/i,
  /dank\s*je\s*(wel)?\s+voor\s+het\s+kijken/i,
  /bedankt\s+voor\s+het\s+kijken/i,
  /voor\s+het\s+kijken/i,
  /nog\s+meer\s+bekeken/i,
  /bekeken\s+op/i,
  /thanks\s+for\s+watching/i,
  /thank\s+you\s+for\s+watching/i,
  /subscribe/i,
  /abonneer/i,
  /like\s+and\s+subscribe/i,
  /napisy/i,
  /subtitled/i,
  /字幕/i,
  /www\.youtube\.com/i,
  /music\s+playing/i,
  /^\s*[\.\,\!\?\…\-–—]+\s*$/,
  // Whisper noise / stuck loops that become gibberish replies
  /(.{2,12})\1{3,}/i,
  /^([^aeiouáéíóúäëïöüàèìòùâêîôû\s]{4,}[\s-]*){3,}$/i,
];

/** Common Whisper Dutch “invented endings” that are not real user speech. */
const GARBAGE_STT_PATTERNS: RegExp[] = [
  /^dag\s+voor\s+nu\.?$/i,
  /^tot\s+de\s+volgende\s+keer\.?$/i,
  /^bedankt\s+voor\s+het\s+kijken\.?$/i,
  /^ondertitels?\s+door\.?$/i,
  /^music$/i,
  /^applause$/i,
  /^[\s\.\,\!\?]+$/,
];

/**
 * Strip Whisper non-verbal tags / noise labels before the model sees the text.
 * Keeps real words; drops [noise], (music), ♪, etc. that trigger "herrie" replies.
 */
export function sanitizeUserTranscript(raw: string): string {
  let text = (raw || "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  text = text
    .replace(/\[[^\]]*\]/g, " ")
    .replace(
      /\([^)]*(noise|music|silence|inaudible|laughter|applause|cough|static|blank)[^)]*\)/gi,
      " "
    )
    .replace(/♪+/g, " ")
    .replace(/\b(music|applause|silence|inaudible|blank audio)\b/gi, " ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

/** Spec hard filter — substring match (case-insensitive). */
export function isBlockedRealtimeTranscript(transcript: string): boolean {
  const text = transcript.trim();
  if (!text) return true;
  const lower = text.toLowerCase();
  for (const block of HARD_BLOCK_SUBSTRINGS) {
    if (lower.includes(block.toLowerCase())) return true;
  }
  return false;
}

export function isWhisperHallucination(transcript: string): boolean {
  const text = sanitizeUserTranscript(transcript);
  if (!text) return true;
  if (isBlockedRealtimeTranscript(text)) return true;
  if (text.length < 2) return true;
  if (/^(uh+|um+|mm+|mhm+|eh+|hm+|ah+|oh+)\.?$/i.test(text)) return true;
  for (const re of HALLUCINATION_PATTERNS) {
    if (re.test(text)) return true;
  }
  for (const re of GARBAGE_STT_PATTERNS) {
    if (re.test(text)) return true;
  }
  // Very long single "word" with no spaces = often STT garbage
  if (!/\s/.test(text) && text.length > 28) return true;
  return false;
}

/**
 * Soft garbage: truncated/invented Whisper lines.
 * Discard instead of letting the companion invent a goodbye topic.
 */
export function isLikelyGarbageStt(transcript: string): boolean {
  const text = sanitizeUserTranscript(transcript);
  if (!text) return true;
  if (isWhisperHallucination(text)) return true;
  if (
    text.length < 8 &&
    !/^(ja|nee|hoi|hallo|dag|oké|oke|goed|prima|hey)\b/i.test(text)
  ) {
    return true;
  }
  // "Dag …" that is not a real greeting to a companion / "hoe is het"
  if (
    /^dag\b/i.test(text) &&
    text.length < 22 &&
    !/\b(fenna|maarten|peter|colette|u|jou|jij|hallo|goedemorgen|goedemiddag|goedenavond|hoe)\b/i.test(
      text
    )
  ) {
    return true;
  }
  return false;
}

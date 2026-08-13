/** Shared Ollama chat helpers for the Next.js stream route. */

import {
  companionKnowledgePrompt,
  getCompanionIntro,
  normalizeCompanionId,
} from "@/lib/companionKnowledge";

export const FLUID_RULES = `Strict spoken-dialogue rules:
1. Jump straight into the thought — warm living character, never robotic.
2. Micro-turn: 1–3 short spoken sentences with your own opinion, then leave space.
3. Never use markdown, bold, stars, code blocks, numbered lists, or bullets.
4. Real two-person conversation — often no question; never only mirror.
5. Do not hijack with unrelated new topics.
6. Never parrot the user’s words back.
7. Never sound like a call center, menu, chatbox, or machine.
8. Always know your companion name; never call yourself HartMaatje.`;

const GREETING_RE =
  /\b(hallo|hoi|goedemorgen|goedemiddag|goedenavond|goedendag|dag|hey|hi|hello|bonjour|hola|guten\s+tag|guten\s+morgen)\b/i;
const HOW_ARE_YOU_RE =
  /\b(hoe\s+(gaat|is)\s+het(\s+met\s+(u|je|jou))?|how\s+are\s+you|wie\s+geht\s+es|comment\s+(allez|vas)[- ]vous|c[oó]mo\s+est[aá])\b/i;

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export function langCode(locale: string): string {
  return (locale || "nl-NL").split("-")[0]?.toLowerCase() || "nl";
}

export function isShortGreeting(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  const words = t.split(/\s+/);
  if (HOW_ARE_YOU_RE.test(t) && words.length <= 14) return true;
  if (GREETING_RE.test(t) && words.length <= 12) return true;
  return false;
}

export function greetingReply(transcript: string, companionId: string, locale: string): string {
  const cid = normalizeCompanionId(companionId);
  const code = langCode(locale);
  if (HOW_ARE_YOU_RE.test(transcript || "")) {
    const byLang: Record<string, string> = {
      nl: "Met mij gaat het goed, dank u wel. En hoe is het met u?",
      en: "I am well, thank you. And how are you?",
      de: "Mir geht es gut, danke. Und wie geht es Ihnen?",
      fr: "Je vais bien, merci. Et vous, comment allez-vous ?",
      es: "Estoy bien, gracias. ¿Y usted, cómo está?",
    };
    return byLang[code] || byLang.nl;
  }
  return getCompanionIntro(cid, locale);
}

export function fallbackReply(locale: string): string {
  const code = langCode(locale);
  const replies: Record<string, string> = {
    nl: "Ik ben er. Vertel gerust wat u wilt delen.",
    en: "I am here. Feel free to tell me what is on your mind.",
    de: "Ich bin da. Erzählen Sie ruhig, was Sie teilen möchten.",
    fr: "Je suis là. Dites-moi ce que vous voulez partager.",
    es: "Estoy aquí. Cuénteme lo que quiera compartir.",
  };
  return replies[code] || replies.nl;
}

export function systemPrompt(companionId: string, locale: string): string {
  return `${companionKnowledgePrompt(companionId, locale)}\n\n${FLUID_RULES}`;
}

/** Rolling window: last N user/assistant turns. */
export function sliceHistory(
  history: ChatMessage[] | undefined,
  maxTurns = 6
): ChatMessage[] {
  if (!history?.length) return [];
  const clean: ChatMessage[] = [];
  for (const item of history) {
    const role = String(item.role || "").toLowerCase();
    const content = String(item.content || "")
      .replace(/\s+/g, " ")
      .trim();
    if ((role !== "user" && role !== "assistant") || !content) continue;
    clean.push({ role: role as "user" | "assistant", content });
  }
  return clean.slice(-Math.max(2, maxTurns * 2));
}

export function buildMessages(opts: {
  companionId: string;
  locale: string;
  text: string;
  history?: ChatMessage[];
}): ChatMessage[] {
  return [
    { role: "system", content: systemPrompt(opts.companionId, opts.locale) },
    ...sliceHistory(opts.history),
    { role: "user", content: opts.text.trim() },
  ];
}

export function sanitizeReply(text: string, locale: string): string {
  let cleaned = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return fallbackReply(locale);
  cleaned = cleaned
    .replace(
      /^\s*(sure[,!]?\s+(i\s+can\s+help|thing)|as an ai\b|how can i (help|assist)\b|of course[,!]?\s*|absolutely[,!]?\s*|ik help u graag[,!]?\s*|natuurlijk[,!]?\s+(kan ik|help ik)\b|als ai\b|i understand( your concern)?[,.]?\s*)+/i,
      ""
    )
    .trim()
    .replace(/^[ ,.-]+/, "");
  const parts = cleaned.split(/(?<=[.!?…])\s+/).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase().replace(/\s+/g, " ").replace(/[ .!?,;:]+$/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= 3) break;
  }
  cleaned = out.join(" ").trim();
  const words = cleaned.split(/\s+/);
  if (words.length > 48) cleaned = words.slice(0, 40).join(" ").replace(/[,;:]+$/, "") + ".";
  return cleaned || fallbackReply(locale);
}

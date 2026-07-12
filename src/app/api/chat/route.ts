import { NextRequest, NextResponse } from "next/server";
import { getCompanionSystemPrompt, getExtraTurnHints } from "@/lib/chatPrompts";
import { guestReply } from "@/lib/guestChat";
import type { AppLang } from "@/lib/languages";
import {
  buildMemoryContextAsync,
  ingestTurnAsync,
} from "@/lib/memory/orchestrator";
import { isGeminiQuotaError } from "@/lib/geminiErrors";
import { jsonApiError } from "@/lib/server/rateLimitResponse";
import { geminiGenerateText, type GeminiTurn } from "@/lib/server/gemini";
import { getVoiceIdentity } from "@/lib/voice/registry";
import type { VoiceIdentityId } from "@/lib/voice/types";

type HistoryItem = { role: "user" | "assistant"; content: string };

type Body = {
  message?: string;
  lang?: AppLang;
  identityId?: VoiceIdentityId;
  history?: HistoryItem[];
  resident_id?: string;
  session_id?: string;
};

const VALID_IDS = new Set<VoiceIdentityId>([
  "maarten",
  "peter",
  "fenna",
  "colette",
]);

function cleanReplyForChat(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/^[-•*]\s+/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ongeldig bericht." }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Leeg bericht." }, { status: 400 });
  }

  const lang: AppLang = body.lang === "en" ? "en" : "nl";
  const identityId = VALID_IDS.has(body.identityId as VoiceIdentityId)
    ? (body.identityId as VoiceIdentityId)
    : "fenna";
  const residentId = body.resident_id?.trim() || "guest";
  const sessionId = body.session_id?.trim();

  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (h) =>
            h &&
            (h.role === "user" || h.role === "assistant") &&
            typeof h.content === "string",
        )
        .slice(-12)
    : [];

  const turns: GeminiTurn[] = history.map((h) => ({
    role: h.role === "assistant" ? "model" : "user",
    text: h.content,
  }));
  turns.push({ role: "user", text: message });

  const memory = await buildMemoryContextAsync({
    residentId,
    lang,
    queryText: message,
    sessionId,
    recentHistory: history,
  });

  const systemPrompt = getCompanionSystemPrompt(
    identityId,
    lang,
    memory.promptBlock,
  );

  const extraHints = getExtraTurnHints(message, lang, identityId);
  const fullPrompt =
    extraHints.length > 0
      ? [systemPrompt, ...extraHints].join("\n\n")
      : systemPrompt;

  let aiText: string | null = null;
  try {
    aiText = await geminiGenerateText(fullPrompt, turns);
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Chat mislukt.";
    if (isGeminiQuotaError(raw)) {
      return jsonApiError(
        raw,
        lang,
        429,
        getVoiceIdentity(identityId).displayName,
      );
    }
  }

  const reply = aiText
    ? cleanReplyForChat(aiText).slice(0, 900)
    : guestReply(message, lang);

  ingestTurnAsync({
    residentId,
    sessionId,
    userText: message,
    assistantReply: reply,
    lang,
  });

  return NextResponse.json({
    reply,
    prompt_version: aiText ? "guest-gemini-memory" : "guest-memory",
    identity_id: identityId,
    memory_updated: true,
  });
}

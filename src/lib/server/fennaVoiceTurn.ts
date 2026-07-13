import { getExtraTurnHints, getVoiceSystemPrompt } from "@/lib/chatPrompts";
import {
  isExclusivityOrDependencyRequest,
  replyFailsDependencyBoundary,
} from "@/lib/companion/conversationLogic";
import type { AppLang } from "@/lib/languages";
import {
  buildVoiceMemoryContext,
  ingestTurnAsync,
} from "@/lib/memory/orchestrator";
import {
  geminiGenerateText,
  geminiLiveVoiceTurn,
  geminiTranscribeAudio,
  getVoiceGeminiConfig,
  normalizeGeminiAudioMime,
  type GeminiTurn,
} from "@/lib/server/gemini";
import { getVoiceIdentity } from "@/lib/voice/registry";
import type { VoiceIdentityId } from "@/lib/voice/types";

type HistoryItem = { role: "user" | "assistant"; content: string };

const HISTORY_LIMIT = 12;

function cleanReply(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/^[-•*]\s+/gm, "")
    .replace(/\n+/g, " ")
    .replace(/—/g, ", ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

function transcriptsAlign(a: string, b: string): boolean {
  if (!a?.trim() || !b?.trim()) return false;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim();
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const ta = new Set(na.split(/\s+/).filter((w) => w.length > 2));
  const tb = new Set(nb.split(/\s+/).filter((w) => w.length > 2));
  if (!ta.size || !tb.size) return false;
  let hits = 0;
  for (const w of ta) {
    if (tb.has(w)) hits += 1;
  }
  return hits / Math.max(ta.size, tb.size) >= 0.45;
}

/** Snelle live-antwoorden die alleen terugvragen → door naar LLM met strengere regels. */
function replyLooksLikeInterrogation(userText: string, reply: string): boolean {
  const r = reply.trim();
  if (!r) return false;
  const userAsked = /\?\s*$/.test(userText.trim()) || /\b(hoe|wat|waar|wie|why|what|how|who)\b/i.test(userText);
  const questionCount = (r.match(/\?/g) ?? []).length;
  const replyOnlyQuestions =
    questionCount >= 2 ||
    (userAsked && questionCount >= 1 && r.split(/\?/)[0].trim().length < 12);
  const identityConfusion =
    /\b(wat bedoel|what do you mean|wie is colette|who is colette)\b/i.test(r);
  return replyOnlyQuestions || identityConfusion;
}

/** Audio in → STT + antwoord. Alle vier personages. */
export async function runCompanionVoiceTurn(input: {
  audioBase64: string;
  mimeType: string;
  lang: AppLang;
  history?: HistoryItem[];
  identityId?: VoiceIdentityId;
  residentId?: string;
  sessionId?: string;
}): Promise<{
  userText: string;
  reply: string;
  memoryUpdated?: boolean;
  timings_ms: Record<string, number>;
}> {
  const t0 = Date.now();
  const lang = input.lang;
  const identityId = input.identityId ?? "fenna";
  const voiceCfg = getVoiceGeminiConfig();
  const voiceModel = voiceCfg?.model;
  const characterName = getVoiceIdentity(identityId).displayName;
  const mimeType = normalizeGeminiAudioMime(input.mimeType);

  if (!input.audioBase64?.trim() || input.audioBase64.length < 120) {
    throw new Error(
      lang === "en"
        ? "That was too short — please speak a little longer."
        : "Dat was te kort — spreek alstublieft iets langer.",
    );
  }

  const residentId = input.residentId?.trim() || "guest";
  const history = Array.isArray(input.history) ? input.history.slice(-HISTORY_LIMIT) : [];

  const memoryLight = buildVoiceMemoryContext({
    residentId,
    lang,
    sessionId: input.sessionId,
    recentHistory: history,
  });

  const historyTurns: GeminiTurn[] = history.map((h) => ({
    role: h.role === "assistant" ? ("model" as const) : ("user" as const),
    text: h.content,
  }));

  const livePrompt = getVoiceSystemPrompt(identityId, lang, memoryLight.promptBlock, []);

  const [sttRaw, liveResult] = await Promise.all([
    geminiTranscribeAudio(input.audioBase64, mimeType, lang, voiceModel),
    geminiLiveVoiceTurn(
      livePrompt,
      historyTurns,
      input.audioBase64,
      mimeType,
      lang,
      characterName,
    ),
  ]);

  const tStt = Date.now();

  const userText = (sttRaw?.trim() || liveResult?.userText?.trim() || "").trim();

  if (!userText) {
    throw new Error(
      lang === "en"
        ? "I did not catch that — please try again."
        : "Ik hoorde u niet goed — probeer het nog eens.",
    );
  }

  let reply = "";
  let path: "live" | "llm" = "llm";

  const dependencyTurn = isExclusivityOrDependencyRequest(userText);

  if (
    liveResult?.reply &&
    !dependencyTurn &&
    transcriptsAlign(userText, liveResult.userText || userText) &&
    !replyLooksLikeInterrogation(userText, liveResult.reply) &&
    !replyFailsDependencyBoundary(userText, liveResult.reply, identityId)
  ) {
    reply = cleanReply(liveResult.reply);
    path = "live";
  } else {
    const systemPrompt = getVoiceSystemPrompt(
      identityId,
      lang,
      memoryLight.promptBlock,
      getExtraTurnHints(userText, lang, identityId),
    );

    const turns: GeminiTurn[] = [
      ...historyTurns,
      { role: "user", text: userText },
    ];

    const aiText = await geminiGenerateText(systemPrompt, turns, {
      temperature: 0.65,
      maxOutputTokens: 140,
      model: voiceModel,
      fast: true,
    });

    reply = aiText
      ? cleanReply(aiText)
      : lang === "en"
        ? "I'm listening — could you say that once more?"
        : "Ik luister — wilt u dat nog een keer zeggen?";
  }

  const tDone = Date.now();

  ingestTurnAsync({
    residentId,
    sessionId: input.sessionId,
    userText,
    assistantReply: reply,
    lang,
  });

  return {
    userText,
    reply,
    memoryUpdated: true,
    timings_ms: {
      stt: tStt - t0,
      llm: path === "live" ? 0 : tDone - tStt,
      total: tDone - t0,
    },
  };
}

/** @deprecated use runCompanionVoiceTurn */
export const runFennaVoiceTurn = runCompanionVoiceTurn;

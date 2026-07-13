import { getExtraTurnHints, getVoiceSystemPrompt } from "@/lib/chatPrompts";
import {
  isExclusivityOrDependencyRequest,
  replyFailsLiveVoiceQuality,
} from "@/lib/companion/conversationLogic";
import type { AppLang } from "@/lib/languages";
import { normalizeCoreLang } from "@/lib/languages";
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
import { appendVoiceTranscript } from "@/lib/server/voiceTranscriptLog";

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
  addressForm?: "formeel" | "informeel";
}): Promise<{
  userText: string;
  reply: string;
  memoryUpdated?: boolean;
  timings_ms: Record<string, number>;
}> {
  const t0 = Date.now();
  const lang = input.lang;
  const coreLang = normalizeCoreLang(lang);
  const identityId = input.identityId ?? "fenna";
  const voiceCfg = getVoiceGeminiConfig();
  const voiceModel = voiceCfg?.model;
  const characterName = getVoiceIdentity(identityId).displayName;
  const addressForm = input.addressForm === "informeel" ? "informeel" : "formeel";
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

  const livePrompt =
    process.env.VOICE_USE_LIVE_PATH === "true"
      ? getVoiceSystemPrompt(
          identityId,
          lang,
          memoryLight.promptBlock,
          [],
          addressForm,
        )
      : "";

  const [sttRaw, liveResult] = await Promise.all([
    geminiTranscribeAudio(input.audioBase64, mimeType, coreLang, voiceModel),
    process.env.VOICE_USE_LIVE_PATH === "true"
      ? geminiLiveVoiceTurn(
          livePrompt,
          historyTurns,
          input.audioBase64,
          mimeType,
          coreLang,
          characterName,
        )
      : Promise.resolve(null),
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
  const useLivePath = process.env.VOICE_USE_LIVE_PATH === "true";

  if (
    useLivePath &&
    liveResult?.reply &&
    transcriptsAlign(userText, liveResult.userText || userText) &&
    !replyLooksLikeInterrogation(userText, liveResult.reply) &&
    !replyFailsLiveVoiceQuality(userText, liveResult.reply, identityId)
  ) {
    reply = cleanReply(liveResult.reply);
    path = "live";
  } else {
    const turnHints = getExtraTurnHints(userText, lang, identityId);
    const systemPrompt = getVoiceSystemPrompt(
      identityId,
      lang,
      memoryLight.promptBlock,
      turnHints,
      addressForm,
    );

    const turns: GeminiTurn[] = [
      ...historyTurns,
      { role: "user", text: userText },
    ];

    const generateOnce = (extraHint?: string, temperature = dependencyTurn ? 0.72 : 0.65) =>
      geminiGenerateText(
        extraHint ? `${systemPrompt}\n\n${extraHint}` : systemPrompt,
        turns,
        {
          temperature,
          maxOutputTokens: 140,
          model: voiceModel,
          fast: true,
        },
      );

    let aiText = await generateOnce();
    reply = aiText ? cleanReply(aiText) : "";

    if (reply && replyFailsLiveVoiceQuality(userText, reply, identityId)) {
      const retryHint =
        lang === "en"
          ? "RETRY: Your last answer missed the point. Reply ONLY to what they just said. No medical sympathy unless they said they feel unwell."
          : "OPNIEUW: Uw vorige antwoord miste de bedoeling. Antwoord ALLEEN op wat ze net zeiden. Geen medische sympathie tenzij zij zelf zeiden dat ze zich niet goed voelen.";
      aiText = await generateOnce(retryHint, 0.55);
      const retryReply = aiText ? cleanReply(aiText) : "";
      if (retryReply && !replyFailsLiveVoiceQuality(userText, retryReply, identityId)) {
        reply = retryReply;
      }
    }

    if (!reply) {
      reply =
        lang === "en"
          ? "I'm listening — could you say that once more?"
          : "Ik luister — wilt u dat nog een keer zeggen?";
    }
  }

  const tDone = Date.now();

  void appendVoiceTranscript({
    kind: "turn",
    identityId,
    lang,
    sessionId: input.sessionId,
    userText,
    reply,
    path,
    timings_ms: {
      stt: tStt - t0,
      llm: path === "live" ? 0 : tDone - tStt,
      total: tDone - t0,
    },
  });

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

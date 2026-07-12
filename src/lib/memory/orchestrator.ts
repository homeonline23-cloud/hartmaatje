import type { AppLang } from "@/lib/languages";
import { consolidateEpisodes, consolidateProfile } from "@/lib/memory/consolidate";
import { appendEpisode, deleteEpisodes, loadEpisodes, saveEpisodes } from "@/lib/memory/episodicStore";
import {
  buildEpisode,
  extractProfileFacts,
  inferActiveTopic,
  rollSessionSummary,
} from "@/lib/memory/extract";
import { deleteProfile, loadProfile, saveProfile } from "@/lib/memory/profileStore";
import {
  buildMemoryPromptBlock,
  formatSessionForPrompt,
  retrieveRelevantEpisodes,
} from "@/lib/memory/retrieve";
import {
  clearAllSessionsForResident,
  getSession,
  updateSession,
} from "@/lib/memory/sessionStore";
import type { IngestTurnInput, MemoryRetrievalResult } from "@/lib/memory/types";
import {
  formatVectorMemoriesForPrompt,
  retrieveVectorMemories,
  storeVectorMemory,
} from "@/lib/memory/vectorStore";

export type BuildMemoryContextInput = {
  residentId: string;
  lang: AppLang;
  queryText?: string;
  sessionId?: string;
  recentHistory?: Array<{ role: "user" | "assistant"; content: string }>;
};

function baseMemoryContext(input: BuildMemoryContextInput): MemoryRetrievalResult {
  const residentId = input.residentId || "guest";
  const profile = loadProfile(residentId);
  const allEpisodes = loadEpisodes(residentId);
  const session = getSession(residentId, input.sessionId);

  const queryParts = [
    input.queryText ?? "",
    ...(input.recentHistory ?? []).slice(-3).map((t) => t.content),
    session.activeTopic ?? "",
  ];
  const episodes = retrieveRelevantEpisodes(allEpisodes, queryParts.join(" "), 3);

  const promptBlock = buildMemoryPromptBlock({
    profile,
    episodes,
    session,
    lang: input.lang,
  });

  return { profile, episodes, session, promptBlock };
}

/** Load profile + episodic + session and format a compact prompt block. */
export function buildMemoryContext(input: BuildMemoryContextInput): MemoryRetrievalResult {
  return baseMemoryContext(input);
}

/** Voice turns: alleen lopend gesprek — geen hobby's/profiel (voorkomt koffie/tuin-grabbelton). */
export function buildVoiceMemoryContext(input: BuildMemoryContextInput): MemoryRetrievalResult {
  const residentId = input.residentId || "guest";
  const profile = loadProfile(residentId);
  const session = getSession(residentId, input.sessionId);
  const sessionBlock = formatSessionForPrompt(session, input.lang);
  const promptBlock = sessionBlock
    ? input.lang === "en"
      ? `[THIS CONVERSATION]\n${sessionBlock}\nUse only if it fits what the user just said.`
      : `[DIT GESPREK]\n${sessionBlock}\nGebruik alleen als het past bij wat de gebruiker net zei.`
    : "";

  return { profile, episodes: [], session, promptBlock };
}

/** Adds pgvector semantic recall when Supabase + service role are configured. */
export async function buildMemoryContextAsync(
  input: BuildMemoryContextInput,
): Promise<MemoryRetrievalResult> {
  const base = baseMemoryContext(input);
  if (process.env.MEMORY_USE_VECTOR !== "true") return base;

  const query = [
    input.queryText ?? "",
    ...(input.recentHistory ?? []).slice(-2).map((t) => t.content),
  ]
    .join(" ")
    .trim();
  if (!query) return base;

  try {
    const vectorRows = await retrieveVectorMemories(input.residentId || "guest", query, 3);
    const vectorBlock = formatVectorMemoriesForPrompt(vectorRows, input.lang);
    if (!vectorBlock) return base;

    return {
      ...base,
      promptBlock: `${base.promptBlock}\n\n${vectorBlock}`,
    };
  } catch {
    return base;
  }
}

/** Update profile, episodic, and session memory after one turn. Fast — no extra LLM call. */
export function ingestTurn(input: IngestTurnInput): boolean {
  const residentId = input.residentId || "guest";
  const userText = input.userText.trim();
  if (!userText) return false;

  let profile = loadProfile(residentId);
  const { profile: merged, changed: profileChanged } = extractProfileFacts(profile, userText);
  profile = consolidateProfile(merged);

  let episodicChanged = false;
  const episode = buildEpisode(residentId, userText, input.lang);
  if (episode) {
    const episodes = consolidateEpisodes([...loadEpisodes(residentId), episode]);
    saveEpisodes(residentId, episodes);
    episodicChanged = true;
  } else if (profileChanged) {
    saveProfile(profile);
  }

  if (profileChanged) saveProfile(profile);

  const session = getSession(residentId, input.sessionId);
  const nextSession = updateSession(residentId, input.sessionId, {
    activeTopic: inferActiveTopic(userText) ?? session.activeTopic,
    conversationSummary: rollSessionSummary(
      session.conversationSummary,
      userText,
      input.assistantReply,
    ),
    recentTurns: [
      ...session.recentTurns,
      { role: "user" as const, content: userText },
      ...(input.assistantReply
        ? [{ role: "assistant" as const, content: input.assistantReply }]
        : []),
    ].slice(-8),
  });

  void nextSession;
  return profileChanged || episodicChanged;
}

/** GDPR-style forget — profile, episodes, and in-process sessions. */
export function forgetResident(residentId: string): void {
  deleteProfile(residentId);
  deleteEpisodes(residentId);
  clearAllSessionsForResident(residentId);
}

/** Fire-and-forget ingest so voice latency stays low. */
export function ingestTurnAsync(input: IngestTurnInput): void {
  setTimeout(() => {
    try {
      ingestTurn(input);
    } catch (err) {
      console.warn("[memory] ingest failed", err);
    }
  }, 0);

  setTimeout(() => {
    void ingestVectorMemoryAsync(input);
  }, 0);
}

async function ingestVectorMemoryAsync(input: IngestTurnInput): Promise<void> {
  const text = input.userText.trim();
  if (!text || text.split(/\s+/).length < 6) return;

  const memoryType = /(vroeger|herinner|verhaal|bezoek|kind|tuin)/i.test(text)
    ? "episodic"
    : "fact";

  try {
    await storeVectorMemory({
      residentId: input.residentId,
      sessionId: input.sessionId,
      content: text.slice(0, 500),
      memoryType,
      importance: memoryType === "episodic" ? 0.75 : 0.55,
      lang: input.lang,
    });
  } catch (err) {
    console.warn("[memory] vector store failed", err);
  }
}

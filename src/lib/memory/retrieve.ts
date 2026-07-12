import type { AppLang } from "@/lib/languages";
import type { EpisodicMemory, ResidentProfile, SessionMemory } from "@/lib/memory/types";

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ0-9]+/i)
      .filter((w) => w.length > 2),
  );
}

function overlapScore(query: Set<string>, target: string, tags: string[] = []): number {
  const targetTokens = tokenize(`${target} ${tags.join(" ")}`);
  let hits = 0;
  for (const q of query) {
    if (targetTokens.has(q)) hits += 1;
  }
  return hits;
}

function recencyBoost(iso: string): number {
  const ageDays = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays < 1) return 0.25;
  if (ageDays < 7) return 0.15;
  if (ageDays < 30) return 0.08;
  return 0;
}

export function retrieveRelevantEpisodes(
  episodes: EpisodicMemory[],
  queryText: string,
  limit = 3,
): EpisodicMemory[] {
  if (!episodes.length) return [];
  const query = tokenize(queryText);
  if (!query.size) return [];

  return episodes
    .map((ep) => {
      const overlap = overlapScore(query, ep.summary, ep.tags);
      const score =
        overlap * 0.55 + ep.importance * 0.25 + recencyBoost(ep.occurredAt);
      return { ep, score, overlap };
    })
    .filter((row) => row.overlap > 0 && row.score > 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.ep);
}

export function formatProfileForPrompt(profile: ResidentProfile, lang: AppLang): string {
  const en = lang === "en";
  const lines: string[] = [];

  if (profile.displayName) {
    lines.push(en ? `Name: ${profile.displayName}` : `Naam: ${profile.displayName}`);
  }
  if (profile.hometown) {
    lines.push(en ? `Hometown: ${profile.hometown}` : `Woonplaats: ${profile.hometown}`);
  }
  if (profile.family.length) {
    lines.push(
      en
        ? `Family: ${profile.family.slice(-6).join(", ")}`
        : `Familie: ${profile.family.slice(-6).join(", ")}`,
    );
  }
  if (profile.pets.length) {
    lines.push(en ? `Pets: ${profile.pets.join(", ")}` : `Huisdieren: ${profile.pets.join(", ")}`);
  }
  if (profile.hobbies.length) {
    lines.push(
      en
        ? `Hobbies: ${profile.hobbies.slice(-5).join(", ")}`
        : `Hobby's: ${profile.hobbies.slice(-5).join(", ")}`,
    );
  }
  if (profile.favoriteMusic.length) {
    lines.push(
      en
        ? `Music: ${profile.favoriteMusic.slice(-4).join(", ")}`
        : `Muziek: ${profile.favoriteMusic.slice(-4).join(", ")}`,
    );
  }
  if (profile.profession) {
    lines.push(
      en ? `Former work: ${profile.profession}` : `Vroeger: ${profile.profession}`,
    );
  }
  if (profile.routines.length) {
    lines.push(
      en
        ? `Routines: ${profile.routines.slice(-4).join(", ")}`
        : `Routines: ${profile.routines.slice(-4).join(", ")}`,
    );
  }
  if (profile.emotionalTopics.length) {
    lines.push(
      en
        ? `Treat gently: ${profile.emotionalTopics.slice(-4).join(", ")}`
        : `Zacht mee: ${profile.emotionalTopics.slice(-4).join(", ")}`,
    );
  }
  if (profile.gentleTopics.length) {
    lines.push(
      en
        ? `Sensitive areas: ${profile.gentleTopics.slice(-3).join(", ")}`
        : `Gevoelige onderwerpen: ${profile.gentleTopics.slice(-3).join(", ")}`,
    );
  }

  return lines.join("\n");
}

export function formatEpisodesForPrompt(
  episodes: EpisodicMemory[],
  lang: AppLang,
): string {
  if (!episodes.length) return "";
  const header = lang === "en" ? "Relevant past moments:" : "Relevante eerdere momenten:";
  const lines = episodes.map((ep) => {
    const when = ep.occurredAt.slice(0, 10);
    return `- (${when}) ${ep.summary.slice(0, 140)}`;
  });
  return `${header}\n${lines.join("\n")}`;
}

export function formatSessionForPrompt(session: SessionMemory | null, lang: AppLang): string {
  if (!session) return "";
  const parts: string[] = [];
  if (session.activeTopic) {
    parts.push(
      lang === "en"
        ? `Current topic: ${session.activeTopic}`
        : `Huidig onderwerp: ${session.activeTopic}`,
    );
  }
  if (session.conversationSummary) {
    parts.push(
      lang === "en"
        ? `This conversation: ${session.conversationSummary}`
        : `Dit gesprek: ${session.conversationSummary}`,
    );
  }
  return parts.join("\n");
}

export function buildMemoryPromptBlock(input: {
  profile: ResidentProfile;
  episodes: EpisodicMemory[];
  session: SessionMemory | null;
  lang: AppLang;
}): string {
  const profileBlock = formatProfileForPrompt(input.profile, input.lang);
  const episodeBlock = formatEpisodesForPrompt(input.episodes, input.lang);
  const sessionBlock = formatSessionForPrompt(input.session, input.lang);

  if (!profileBlock && !episodeBlock && !sessionBlock) {
    return input.lang === "en"
      ? "[MEMORY]\nNo stored memories yet. Listen and remember only what the resident clearly shares."
      : "[GEHEUGEN]\nNog geen opgeslagen herinneringen. Onthoud alleen wat de bewoner duidelijk deelt.";
  }

  const header =
    input.lang === "en"
      ? "[MEMORY — use gently, do not repeat every turn]"
      : "[GEHEUGEN — gebruik zacht, niet in elk antwoord herhalen]";

  const guidance =
    input.lang === "en"
      ? "Use memory ONLY when the user just mentioned that topic or clearly asked about it. Never introduce garden, family, or past topics they did not bring up in this turn."
      : "Gebruik geheugen ALLEEN als de gebruiker dat onderwerp net noemde of er duidelijk naar vroeg. Introduceer nooit tuin, familie of oude onderwerpen die ze in deze beurt niet noemden.";

  return [header, profileBlock, episodeBlock, sessionBlock, guidance]
    .filter(Boolean)
    .join("\n");
}

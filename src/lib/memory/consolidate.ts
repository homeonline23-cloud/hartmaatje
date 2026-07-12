import type { EpisodicMemory, ResidentProfile } from "@/lib/memory/types";

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function wordSet(text: string): Set<string> {
  return new Set(normalize(text).split(" ").filter((w) => w.length > 2));
}

function similarity(a: string, b: string): number {
  const A = wordSet(a);
  const B = wordSet(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / Math.max(A.size, B.size);
}

function dedupeList(values: string[]): string[] {
  const out: string[] = [];
  for (const v of values) {
    const n = normalize(v);
    if (!n) continue;
    if (out.some((x) => normalize(x) === n)) continue;
    out.push(v.trim());
  }
  return out;
}

export function consolidateProfile(profile: ResidentProfile): ResidentProfile {
  return {
    ...profile,
    family: dedupeList(profile.family).slice(-12),
    pets: dedupeList(profile.pets).slice(-8),
    hobbies: dedupeList(profile.hobbies).slice(-10),
    favoriteMusic: dedupeList(profile.favoriteMusic).slice(-8),
    preferences: dedupeList(profile.preferences).slice(-10),
    emotionalTopics: dedupeList(profile.emotionalTopics).slice(-10),
    upcomingVisits: dedupeList(profile.upcomingVisits).slice(-8),
    routines: dedupeList(profile.routines).slice(-8),
    gentleTopics: dedupeList(profile.gentleTopics).slice(-8),
    communicationPreferences: dedupeList(profile.communicationPreferences).slice(-6),
    spiritualPreferences: dedupeList(profile.spiritualPreferences).slice(-6),
  };
}

export function consolidateEpisodes(episodes: EpisodicMemory[]): EpisodicMemory[] {
  const sorted = episodes
    .slice()
    .sort((a, b) => b.importance - a.importance || b.occurredAt.localeCompare(a.occurredAt));

  const kept: EpisodicMemory[] = [];
  for (const ep of sorted) {
    const dup = kept.find((k) => similarity(k.summary, ep.summary) >= 0.72);
    if (dup) {
      dup.importance = Math.max(dup.importance, ep.importance);
      dup.occurredAt = ep.occurredAt > dup.occurredAt ? ep.occurredAt : dup.occurredAt;
      continue;
    }
    kept.push(ep);
  }
  return kept.slice(0, 80);
}

import type { AppLang } from "@/lib/languages";
import type { EpisodicMemory, ResidentProfile } from "@/lib/memory/types";

const TRIVIAL = /^(yes|no|ok|okay|hello|hi|hallo|hoi|ja|nee|thanks|thank you|dank je|bedankt)\.?$/i;

const NAME_PATTERNS: Array<{ re: RegExp; field: "displayName" }> = [
  { re: /mijn naam is\s+([a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ][\w\-']{1,30})/i, field: "displayName" },
  { re: /ik heet\s+([a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ][\w\-']{1,30})/i, field: "displayName" },
  { re: /noem (?:mij|me)\s+([a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ][\w\-']{1,30})/i, field: "displayName" },
  { re: /my name is\s+([a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ][\w\-']{1,30})/i, field: "displayName" },
];

type ListField = keyof Pick<
  ResidentProfile,
  | "family"
  | "pets"
  | "hobbies"
  | "favoriteMusic"
  | "preferences"
  | "emotionalTopics"
  | "upcomingVisits"
  | "routines"
  | "gentleTopics"
  | "communicationPreferences"
  | "spiritualPreferences"
>;

const LIST_PATTERNS: Array<{ re: RegExp; field: ListField; template: string }> = [
  { re: /kleinzoon\s+(\w+)/i, field: "family", template: "kleinzoon {0}" },
  { re: /kleindochter\s+(\w+)/i, field: "family", template: "kleindochter {0}" },
  { re: /zoon\s+(\w+)/i, field: "family", template: "zoon {0}" },
  { re: /dochter\s+(\w+)/i, field: "family", template: "dochter {0}" },
  { re: /grandson\s+(\w+)/i, field: "family", template: "grandson {0}" },
  { re: /granddaughter\s+(\w+)/i, field: "family", template: "granddaughter {0}" },
  { re: /hond\s+(\w+)/i, field: "pets", template: "hond {0}" },
  { re: /kat\s+(\w+)/i, field: "pets", template: "kat {0}" },
  { re: /dog\s+(?:named\s+)?(\w+)/i, field: "pets", template: "dog {0}" },
  { re: /kom\s+uit\s+(.+?)(?:\.|,|$)/i, field: "hobbies", template: "herkomst: {0}" },
  { re: /woon\s+in\s+(.+?)(?:\.|,|$)/i, field: "hobbies", template: "woonplaats: {0}" },
  { re: /hobby\s+(?:is\s+)?(.+?)(?:\.|,|$)/i, field: "hobbies", template: "{0}" },
  { re: /ik hou van\s+(.+?)(?:\.|,|$)/i, field: "hobbies", template: "{0}" },
  { re: /muziek\s+(.+?)(?:\.|,|$)/i, field: "favoriteMusic", template: "{0}" },
  { re: /(?:was|ben)\s+(\w+)\s+geweest/i, field: "hobbies", template: "beroep: {0}" },
  { re: /(?:miss|vermis)\s+(.+?)(?:\.|,|$)/i, field: "emotionalTopics", template: "vermist: {0}" },
  { re: /(?:zondag|sunday).{0,30}(?:eenzaam|lonely)/i, field: "emotionalTopics", template: "zondagen kunnen eenzaam voelen" },
  { re: /elke (?:ochtend|morgen|avond)\s+(.+?)(?:\.|,|$)/i, field: "routines", template: "{0}" },
  { re: /graag (?:niet|liever niet)\s+(.+?)(?:\.|,|$)/i, field: "gentleTopics", template: "voorzichtig met: {0}" },
];

const STORY_HINTS =
  /(vroeger|herinner|toen ik|kind|kleinkind|bezoek|tuin|man|vrouw|overleden|dans|muziek|verhaal|memory|childhood|grandson|granddaughter|visit|garden|spouse)/i;

const EMOTION_HINTS: Record<string, EpisodicMemory["emotionalTone"]> = {
  blij: "joyful",
  happy: "joyful",
  verdriet: "sad",
  sad: "sad",
  eenzaam: "lonely",
  lonely: "lonely",
  bang: "anxious",
  worried: "anxious",
  warm: "warm",
};

function capitalizeName(value: string): string {
  const v = value.trim().replace(/[.!?,]+$/, "");
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : v;
}

function pushUnique(list: string[], value: string, max = 12): boolean {
  const v = value.trim().slice(0, 120);
  if (!v || list.some((x) => x.toLowerCase() === v.toLowerCase())) return false;
  list.push(v);
  if (list.length > max) list.splice(0, list.length - max);
  return true;
}

export function extractProfileFacts(
  profile: ResidentProfile,
  userMessage: string,
): { profile: ResidentProfile; changed: boolean } {
  const text = userMessage.trim();
  if (!text || TRIVIAL.test(text)) return { profile, changed: false };

  let changed = false;
  const lower = text.toLowerCase();

  for (const { re } of NAME_PATTERNS) {
    const m = lower.match(re);
    if (!m?.[1]) continue;
    const name = capitalizeName(m[1]);
    if (!name || ["fenna", "anna", "guest"].includes(name.toLowerCase())) continue;
    if (profile.displayName !== name) {
      profile.displayName = name;
      changed = true;
    }
    break;
  }

  for (const { re, field, template } of LIST_PATTERNS) {
    const m = lower.match(re);
    if (!m) continue;
    const value = template.replace("{0}", m[1] ?? "").trim();
    if (!value) continue;

    if (field === "hobbies" && value.startsWith("woonplaats:")) {
      const town = value.replace("woonplaats:", "").trim();
      if (town && profile.hometown !== town) {
        profile.hometown = town.slice(0, 80);
        changed = true;
      }
      continue;
    }
    if (field === "hobbies" && value.startsWith("herkomst:")) {
      const town = value.replace("herkomst:", "").trim();
      if (town && profile.hometown !== town) {
        profile.hometown = town.slice(0, 80);
        changed = true;
      }
      continue;
    }
    if (value.startsWith("beroep:")) {
      const job = value.replace("beroep:", "").trim();
      if (job && profile.profession !== job) {
        profile.profession = job.slice(0, 80);
        changed = true;
      }
      continue;
    }

    if (pushUnique(profile[field] as string[], value)) changed = true;
  }

  return { profile, changed };
}

export function shouldCreateEpisode(userMessage: string): boolean {
  const text = userMessage.trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 8 || TRIVIAL.test(text)) return false;
  if (STORY_HINTS.test(text)) return true;
  return words.length >= 14;
}

export function buildEpisode(
  residentId: string,
  userMessage: string,
  lang: AppLang,
): EpisodicMemory | null {
  if (!shouldCreateEpisode(userMessage)) return null;

  const text = userMessage.trim().slice(0, 220);
  const lower = text.toLowerCase();
  let emotionalTone: EpisodicMemory["emotionalTone"] = "neutral";
  for (const [word, tone] of Object.entries(EMOTION_HINTS)) {
    if (lower.includes(word)) {
      emotionalTone = tone;
      break;
    }
  }

  const tags = Array.from(
    new Set(
      lower
        .split(/[^a-zàáâãäåèéêëìíîïòóôõöùúûüýÿ0-9]+/i)
        .filter((w) => w.length > 3)
        .slice(0, 8),
    ),
  );

  let importance = 0.55;
  if (STORY_HINTS.test(text)) importance += 0.2;
  if (emotionalTone !== "neutral") importance += 0.15;
  if (text.split(/\s+/).length > 20) importance += 0.1;

  return {
    id: `ep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    residentId,
    summary: text,
    occurredAt: new Date().toISOString(),
    tags,
    emotionalTone,
    importance: Math.min(importance, 1),
    sourceTurn: text.slice(0, 120),
  };
}

export function inferActiveTopic(userMessage: string): string | undefined {
  const text = userMessage.trim().slice(0, 80);
  if (text.split(/\s+/).length < 4) return undefined;
  return text;
}

export function rollSessionSummary(prev: string, userText: string, reply?: string): string {
  const chunk = [userText.trim().slice(0, 60), reply?.trim().slice(0, 60)]
    .filter(Boolean)
    .join(" → ");
  const parts = prev ? prev.split(" | ").filter(Boolean) : [];
  parts.push(chunk);
  return parts.slice(-6).join(" | ").slice(0, 420);
}

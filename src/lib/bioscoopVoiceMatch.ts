import type { AppLang } from "@/i18n/config";
import { BIOSCOOP_CATEGORY_IDS, type BioscoopCategoryId } from "./bioscoopMedia";

/**
 * Spoken-wish keywords per category, independent of the (sometimes placeholder)
 * on-screen label text — so voice matching stays reliable even if labels change.
 * Keep entries lowercase, unaccented; normalize() strips accents at match time.
 */
const KEYWORDS: Record<BioscoopCategoryId, Partial<Record<AppLang, string[]>>> = {
  nature: {
    nl: ["natuur", "ontspannen", "ontspanning", "muziek", "rust", "rustig"],
    en: ["nature", "relax", "relaxing", "calm", "music", "peaceful"],
    de: ["natur", "entspannen", "entspannung", "musik", "ruhe", "ruhig"],
    fr: ["nature", "detente", "relaxant", "musique", "calme"],
    es: ["naturaleza", "relajar", "relajante", "musica", "calma", "tranquilo"],
  },
  landscapes: {
    nl: ["zee", "oceaan", "vis", "vissen", "onderwater", "diepzee"],
    en: ["sea", "ocean", "fish", "underwater", "deep sea"],
    de: ["meer", "ozean", "fisch", "fische", "unterwasser"],
    fr: ["mer", "ocean", "poisson", "poissons", "sous marin"],
    es: ["mar", "oceano", "pez", "peces", "submarino"],
  },
  beaches: {
    nl: ["strand", "caraiben", "caraibisch", "eiland", "eilanden"],
    en: ["beach", "beaches", "caribbean", "island", "islands"],
    de: ["strand", "karibik", "insel", "inseln"],
    fr: ["plage", "plages", "caraibes", "ile", "iles"],
    es: ["playa", "playas", "caribe", "isla", "islas"],
  },
  forests: {
    nl: ["bos", "vogel", "vogels", "amazone", "jungle", "oerwoud"],
    en: ["forest", "bird", "birds", "amazon", "jungle"],
    de: ["wald", "vogel", "amazonas", "dschungel"],
    fr: ["foret", "oiseau", "oiseaux", "amazone", "jungle"],
    es: ["bosque", "pajaro", "pajaros", "amazonas", "selva"],
  },
  mountains: {
    nl: ["berg", "bergen", "griekenland", "grieks"],
    en: ["mountain", "mountains", "greece", "greek"],
    de: ["berg", "berge", "griechenland"],
    fr: ["montagne", "montagnes", "grece"],
    es: ["montana", "montanas", "grecia"],
  },
  villages: {
    nl: ["dorp", "dorpen", "brazilie", "braziliaans"],
    en: ["village", "villages", "brazil"],
    de: ["dorf", "dorfer", "brasilien"],
    fr: ["village", "villages", "bresil"],
    es: ["pueblo", "pueblos", "brasil"],
  },
  animals: {
    nl: ["dier", "dieren", "wildlife", "documentaire", "safari"],
    en: ["animal", "animals", "wildlife", "documentary", "safari"],
    de: ["tier", "tiere", "wildtiere", "dokumentation", "safari"],
    fr: ["animal", "animaux", "documentaire", "safari"],
    es: ["animal", "animales", "documental", "safari"],
  },
  gardens: {
    nl: ["tuin", "tuinen", "italie", "bloemen", "bloeiend"],
    en: ["garden", "gardens", "italy", "flowers", "blooming"],
    de: ["garten", "italien", "blumen"],
    fr: ["jardin", "jardins", "italie", "fleurs"],
    es: ["jardin", "jardines", "italia", "flores"],
  },
};

/**
 * Conversational filler/meta-phrases that dilute a YouTube search query
 * ("I would like to see...", "...on YouTube") — stripped before searching,
 * kept for local category matching (which already substring-matches loosely).
 */
const FILLER_PHRASES: Record<AppLang, string[]> = {
  nl: [
    "ik wil graag zien", "ik wil zien", "ik zou graag zien", "laat me zien",
    "laat mij zien", "kun je", "kunt u", "zoek naar", "zoek even",
    "op youtube", "in de youtube", "op de youtube", "via youtube",
    "we gaan", "wil je", "wilt u", "graag", "alsjeblieft", "alstublieft",
  ],
  en: [
    "i would like to see", "i'd like to see", "i want to see", "i wanna see",
    "show me", "can you show me", "can you find", "could you show me",
    "search for", "look up", "look for", "on youtube", "please",
    "let's watch", "i'd like to watch", "i want to watch",
  ],
  de: [
    "ich möchte sehen", "ich will sehen", "zeig mir", "zeigen sie mir",
    "kannst du", "können sie", "suche nach", "such mal",
    "auf youtube", "bei youtube", "bitte",
  ],
  fr: [
    "je voudrais voir", "je veux voir", "montre-moi", "montrez-moi",
    "peux-tu", "pouvez-vous", "cherche", "recherche",
    "sur youtube", "s'il te plait", "s'il vous plait",
  ],
  es: [
    "quiero ver", "quisiera ver", "muestrame", "muestreme",
    "puedes", "puede usted", "busca", "buscar",
    "en youtube", "por favor",
  ],
};

/**
 * Strips conversational filler so only the actual subject is sent to
 * YouTube search, e.g. "I would like to see a documentary on YouTube about
 * whales" -> "documentary about whales". Falls back to the original spoken
 * text if stripping filler would leave nothing meaningful behind.
 */
export function cleanSearchQuery(transcript: string, lang: AppLang): string {
  const original = transcript;
  let text = normalize(transcript);
  if (!text) return original;

  for (const phrase of FILLER_PHRASES[lang] ?? []) {
    text = text.replace(new RegExp(`\\b${normalize(phrase)}\\b`, "gi"), " ");
  }
  // Drop a leftover leading conjunction ("and we're going to watch...").
  text = text.replace(/^(en|and|und|et|y)\s+/i, "");
  text = text.replace(/\s+/g, " ").trim();

  return text.length >= 2 ? text : original.trim();
}

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Best-effort match of a spoken wish to one of the Bioscoop categories.
 * Returns null when nothing scores — caller should fall back to a hint
 * inviting the resident to tap a button instead.
 */
export function matchBioscoopCategory(
  transcript: string,
  lang: AppLang
): BioscoopCategoryId | null {
  const spoken = normalize(transcript);
  if (!spoken) return null;

  let best: { id: BioscoopCategoryId; score: number } | null = null;
  for (const id of BIOSCOOP_CATEGORY_IDS) {
    const words = KEYWORDS[id][lang] ?? [];
    let score = 0;
    for (const word of words) {
      if (spoken.includes(normalize(word))) score += word.length;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { id, score };
    }
  }
  return best?.id ?? null;
}

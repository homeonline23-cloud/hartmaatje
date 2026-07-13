/** Warme lokale antwoorden — gebaseerd op companion-onderzoek voor ouderen. */
import { trimCompanionReply } from "@/lib/companionVoice";
import type { AppLang } from "@/lib/languages";
import { normalizeCoreLang } from "@/lib/languages";

function reply(text: string): string {
  return trimCompanionReply(text);
}

const GUEST_REPLIES: Record<
  "nl" | "en",
  {
    greeting: string;
    family: string;
    lonely: string;
    quiet: string;
    wantTalk: string;
    worried: string;
    bored: string;
    thanks: string;
    howAreYou: string;
    people: string;
    default: string;
  }
> = {
  nl: {
    greeting: "Hallo. Ik ben Fenna. Waar wilt u het vandaag over hebben?",
    family: "Over familie praten kan veel oproepen. Hoe was dat voor u?",
    lonely:
      "Dat klinkt zwaar. Wilt u er iets meer over vertellen?",
    quiet:
      "Stille dagen kunnen zwaar zijn. Wat speelt er bij u op zo'n dag?",
    wantTalk: "Natuurlijk. Waar wilt u het over hebben?",
    worried:
      "Dat maakt u ongerust, begrijp ik. Hoe voelt dat voor u op dit moment?",
    bored:
      "Soms is een dag lang. Is er iets kleins dat u vandaag een beetje opfleurde?",
    thanks: "Graag gedaan. Waar wilt u het verder over hebben?",
    howAreYou: "Vertel eens — hoe gaat het met u vandaag?",
    people:
      "Dank u dat u dat vertelt. Wat betekent dat voor u op dit moment?",
    default: "Ik luister. Wilt u daar iets meer over vertellen?",
  },
  en: {
    greeting:
      "Hello. I'm glad you're here. What would you like to talk about today?",
    family: "It's lovely to hear about family. How was that for you?",
    lonely:
      "That sounds heavy, and I'm glad you said it. Would you like to tell me a bit more?",
    quiet:
      "Quiet days can feel heavy. I'm here — please keep talking if you'd like.",
    wantTalk: "Of course. I'm listening — what would you like to talk about?",
    worried:
      "I understand that worries you. How does that feel for you right now?",
    bored:
      "Some days feel long. Was there something small that brightened your day a little?",
    thanks: "You're welcome. I'm here whenever you'd like to talk.",
    howAreYou: "Thank you for sharing that. How are you doing?",
    people:
      "Thank you for telling me. What does that mean for you right now?",
    default: "I'm listening. Would you like to tell me a bit more about that?",
  },
};

export function guestReply(message: string, lang: AppLang = "nl"): string {
  const m = message.toLowerCase().trim();
  const t = GUEST_REPLIES[normalizeCoreLang(lang)];

  if (/^(hallo|hoi|hello|goedendag|goedenavond|goedemorgen|good morning|good evening|hi\b)/.test(m)) {
    return reply(t.greeting);
  }

  if (/(kleinkind|kleinzoon|kleindochter|oma|opa|bezoek.*familie|grandchild|grandson|granddaughter|grandma|grandpa|family visit)/.test(m)) {
    return reply(t.family);
  }

  if (/(eenzaam|alleen|verdriet|verdrietig|somber|missen|lonely|alone|sad|gloomy|miss you|missing)/.test(m)) {
    return reply(t.lonely);
  }

  if (/(stil in huis|stil thuis|stil vandaag|wat stil|quiet (at )?home|so quiet|very quiet)/.test(m)) {
    return reply(t.quiet);
  }

  if (/(even praten|graag praten|wil praten|wilde praten|want to talk|like to talk|need to talk)/.test(m)) {
    return reply(t.wantTalk);
  }

  if (/(ziek|ziekte|niet goed|ongerust|bezorgd|zorgen om|ill|sick|not well|worried|anxious)/.test(m)) {
    return reply(t.worried);
  }

  if (/(vervelen|saai|verveel|bored|boring)/.test(m)) {
    return reply(t.bored);
  }

  if (/(dank|bedankt|thank)/.test(m)) {
    return reply(t.thanks);
  }

  if (/(hoe gaat|dag gehad|vandaag|met u|met mij|how are you|how was your day|today)/.test(m)) {
    return reply(t.howAreYou);
  }

  if (/(familie|vriend|vriendin|buur|dochter|zoon|man|vrouw|family|friend|neighbor|daughter|son|husband|wife)/.test(m)) {
    return reply(t.people);
  }

  return reply(t.default);
}

const STORAGE_KEY = "hartmaatje_guest_messages_v2";

export type GuestMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function loadGuestMessages(): GuestMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuestMessages(items: GuestMessage[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function clearGuestMessages() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

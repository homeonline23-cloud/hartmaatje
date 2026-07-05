/** Warme lokale antwoorden — geen login, geen server nodig. */
export function guestReply(message: string): string {
  const m = message.toLowerCase().trim();

  if (/^(hallo|hoi|hello|goedendag|goedenavond|goedemorgen)/.test(m)) {
    return "Goedendag. Fijn dat u er bent. Waar wilt u het over hebben?";
  }
  if (/(eenzaam|alleen|verdriet|verdrietig|somber)/.test(m)) {
    return "Dat klinkt zwaar. Fijn dat u het zegt — ik luister graag.";
  }
  if (/(stil in huis|stil thuis|stil vandaag|wat stil)/.test(m)) {
    return "Stille dagen kunnen zwaar voelen. Vertel gerust — ik luister.";
  }
  if (/(even praten|graag praten|wil praten|wilde praten)/.test(m)) {
    return "Natuurlijk. Ik ben er — waar wilt u het over hebben?";
  }
  if (/(dank|bedankt)/.test(m)) {
    return "Graag gedaan. Ik ben er als u wilt praten.";
  }
  if (/(hoe gaat|dag gehad|vandaag|met u|met mij)/.test(m)) {
    return "Fijn dat u dat deelt. Gaat het een beetje met u?";
  }

  return "Ik luister u graag. Wilt u daar iets meer over vertellen?";
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

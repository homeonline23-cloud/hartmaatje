const STORAGE_KEY = "bel_balie_emergency_num";
const ROOM_STORAGE_KEY = "bel_balie_room_number";

/** SSR-safe read; returns null on the server or if never configured. */
export function getFrontDeskNumber(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setFrontDeskNumber(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore storage errors (e.g. private mode)
  }
}

/**
 * Optional per-device room label (e.g. "204", "B12") — the physical room
 * number posted above the door. Display-only: shown on the "connecting"
 * popup so front desk staff know which room is calling. Not dialed.
 */
export function getFrontDeskRoom(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ROOM_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setFrontDeskRoom(value: string): void {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.localStorage.setItem(ROOM_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(ROOM_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors (e.g. private mode)
  }
}

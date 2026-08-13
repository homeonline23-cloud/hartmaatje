import type { AppLang } from "@/i18n/config";

/** Minimal prefs stored locally — no profile/family features. */
export type ProfileData = {
  language: AppLang;
};

export const PROFILE_STORAGE_KEY = "hartmaatje-profile";

export const defaultProfile = (): ProfileData => ({
  language: "nl",
});

export function loadProfile(): ProfileData {
  if (typeof window === "undefined") return defaultProfile();
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return defaultProfile();
    const parsed = { ...defaultProfile(), ...JSON.parse(raw) } as ProfileData;
    if (
      parsed.language !== "nl" &&
      parsed.language !== "en" &&
      parsed.language !== "de" &&
      parsed.language !== "fr" &&
      parsed.language !== "es"
    ) {
      parsed.language = "nl";
    }
    return parsed;
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(data: ProfileData): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

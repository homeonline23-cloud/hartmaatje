import fs from "fs";
import path from "path";
import { memoryBaseDir, safeResidentFileName } from "@/lib/memory/paths";
import { emptyProfile, type ResidentProfile } from "@/lib/memory/types";

const cache = new Map<string, ResidentProfile>();

function profilePath(residentId: string): string {
  return path.join(memoryBaseDir(), `${safeResidentFileName(residentId)}.json`);
}

export function loadProfile(residentId: string): ResidentProfile {
  const key = safeResidentFileName(residentId);
  if (cache.has(key)) return cache.get(key)!;

  const file = profilePath(residentId);
  if (!fs.existsSync(file)) {
    const fresh = emptyProfile(residentId);
    cache.set(key, fresh);
    return fresh;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as Partial<ResidentProfile>;
    const profile: ResidentProfile = {
      ...emptyProfile(residentId),
      ...raw,
      residentId,
      family: raw.family ?? [],
      pets: raw.pets ?? [],
      hobbies: raw.hobbies ?? [],
      favoriteMusic: raw.favoriteMusic ?? [],
      preferences: raw.preferences ?? [],
      emotionalTopics: raw.emotionalTopics ?? [],
      upcomingVisits: raw.upcomingVisits ?? [],
      routines: raw.routines ?? [],
      gentleTopics: raw.gentleTopics ?? [],
      communicationPreferences: raw.communicationPreferences ?? [],
      spiritualPreferences: raw.spiritualPreferences ?? [],
    };
    cache.set(key, profile);
    return profile;
  } catch {
    const fresh = emptyProfile(residentId);
    cache.set(key, fresh);
    return fresh;
  }
}

export function saveProfile(profile: ResidentProfile): void {
  const dir = memoryBaseDir();
  fs.mkdirSync(dir, { recursive: true });
  profile.updatedAt = new Date().toISOString();
  const key = safeResidentFileName(profile.residentId);
  cache.set(key, profile);
  fs.writeFileSync(profilePath(profile.residentId), JSON.stringify(profile, null, 2), "utf-8");
}

export function deleteProfile(residentId: string): void {
  const key = safeResidentFileName(residentId);
  cache.delete(key);
  const file = profilePath(residentId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

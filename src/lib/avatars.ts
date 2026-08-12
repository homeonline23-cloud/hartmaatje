import type { VoiceIdentityId } from "@/lib/voice/types";

/** Portrait onder /public/avatars/{id}/portrait.png — null = letter-fallback in UI. */
const AVATAR_PORTRAIT_PATHS: Partial<Record<VoiceIdentityId, string>> = {
  maarten: "/avatars/maarten/portrait.png",
  peter: "/avatars/peter/portrait.png",
  fenna: "/avatars/fenna/portrait.png",
  colette: "/avatars/colette/portrait.png",
};

/** Korte welkomstvideo — opent in live-venster bij stemkeuze. */
const WELCOME_VIDEO_PATHS: Partial<Record<VoiceIdentityId, string>> = {
  maarten: "/avatars/maarten/welcome.mp4",
  peter: "/avatars/peter/welcome.mp4",
  fenna: "/avatars/fenna/welcome.mp4",
  colette: "/avatars/colette/welcome.mp4",
};

/** Cache-bust na vervanging van een welkomstvideo. */
const WELCOME_VIDEO_VERSIONS: Partial<Record<VoiceIdentityId, number>> = {
  maarten: 2,
  peter: 2,
  fenna: 4,
  colette: 3,
};

/** Cache-bust na vervanging van een portret — verhoog het versienummer. */
const AVATAR_PORTRAIT_VERSIONS: Partial<Record<VoiceIdentityId, number>> = {
  peter: 2,
  fenna: 2,
};

/** Crop Meta-watermerk uit hoek van AI-gegenereerde portretten. */
const AVATAR_PORTRAIT_CROP: Partial<
  Record<VoiceIdentityId, { scale: string; position: string }>
> = {
  fenna: { scale: "scale-[1.28]", position: "object-[52%_20%]" },
  colette: { scale: "scale-[1.28]", position: "object-[52%_20%]" },
};

/** Optionele crop voor welkomstvideo (bijv. watermerk). Nieuwe video's: geen crop. */
const WELCOME_VIDEO_CROP: Partial<
  Record<VoiceIdentityId, { scale: string; position: string }>
> = {
  fenna: { scale: "scale-[1.24]", position: "object-[52%_20%]" },
};

export function getWelcomeVideoCrop(identityId: VoiceIdentityId) {
  return WELCOME_VIDEO_CROP[identityId] ?? null;
}

export function getAvatarPortraitCrop(identityId: VoiceIdentityId) {
  return AVATAR_PORTRAIT_CROP[identityId] ?? null;
}

/** Volgorde op het welkomstscherm — mannen links, vrouwen rechts. */
export const HOME_PORTRAIT_IDENTITIES: readonly VoiceIdentityId[] = [
  "maarten",
  "peter",
  "fenna",
  "colette",
];

export function getAvatarPortraitUrl(
  identityId: VoiceIdentityId,
): string | null {
  const path = AVATAR_PORTRAIT_PATHS[identityId];
  if (!path) return null;
  const version = AVATAR_PORTRAIT_VERSIONS[identityId];
  return version ? `${path}?v=${version}` : path;
}

export function hasAvatarPortrait(identityId: VoiceIdentityId): boolean {
  return identityId in AVATAR_PORTRAIT_PATHS;
}

export function getWelcomeVideoUrl(
  identityId: VoiceIdentityId,
): string | null {
  const path = WELCOME_VIDEO_PATHS[identityId];
  if (!path) return null;
  const version = WELCOME_VIDEO_VERSIONS[identityId];
  return version ? `${path}?v=${version}` : path;
}

export function hasWelcomeVideo(identityId: VoiceIdentityId): boolean {
  return identityId in WELCOME_VIDEO_PATHS;
}

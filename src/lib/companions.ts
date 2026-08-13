export type CompanionId = "fenna" | "maarten" | "peter" | "colette";

type Companion = {
  id: CompanionId;
  name: string;
  portrait: string;
  welcomeVideo: string;
  /** Crop to hide corner watermarks in welcome video */
  welcomeCrop?: { scale: string; position: string };
  portraitCrop?: { scale: string; position: string };
};

export const companions: readonly Companion[] = [
  {
    id: "fenna",
    name: "Fenna",
    portrait: "/avatars/fenna/portrait.png?v=5",
    welcomeVideo: "/avatars/fenna/welcome.mp4?v=4",
    portraitCrop: { scale: "scale-[1.28]", position: "object-[52%_20%]" },
  },
  {
    id: "maarten",
    name: "Maarten",
    portrait: "/avatars/maarten/portrait.png",
    welcomeVideo: "/avatars/maarten/welcome.mp4?v=3",
  },
  {
    id: "peter",
    name: "Peter",
    portrait: "/avatars/peter/portrait.png?v=2",
    welcomeVideo: "/avatars/peter/welcome.mp4?v=2",
  },
  {
    id: "colette",
    name: "Colette",
    portrait: "/avatars/colette/portrait.png",
    welcomeVideo: "/avatars/colette/welcome.mp4?v=3",
    portraitCrop: { scale: "scale-[1.28]", position: "object-[52%_20%]" },
  },
] as const;

export function getCompanion(id: string) {
  return companions.find((c) => c.id === id) ?? null;
}

export function getWelcomeVideoUrl(id: CompanionId): string {
  const c = companions.find((x) => x.id === id);
  return c?.welcomeVideo ?? `/avatars/${id}/welcome.mp4`;
}

export function getWelcomeVideoCrop(id: CompanionId) {
  return companions.find((x) => x.id === id)?.welcomeCrop ?? null;
}

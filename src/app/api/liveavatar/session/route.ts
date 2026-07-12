import { NextResponse } from "next/server";

import { isLiveAvatarConfigured } from "@/lib/liveavatar/characters";
import { createLiveAvatarSessionToken } from "@/lib/liveavatar/server";
import type { LiveAvatarCharacterId } from "@/lib/liveavatar/characters";

const VALID_CHARACTERS = new Set<LiveAvatarCharacterId>([
  "maarten",
  "peter",
  "fenna",
  "colette",
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      characterId?: string;
      language?: "nl" | "en";
    };

    const characterId = body.characterId as LiveAvatarCharacterId;
    if (!characterId || !VALID_CHARACTERS.has(characterId)) {
      return NextResponse.json(
        { error: "Ongeldig personage." },
        { status: 400 },
      );
    }

    if (!isLiveAvatarConfigured(characterId)) {
      return NextResponse.json(
        { error: `LiveAvatar is nog niet ingesteld voor ${characterId}.` },
        { status: 503 },
      );
    }

    const language = body.language === "en" ? "en" : "nl";
    const session = await createLiveAvatarSessionToken(characterId, language);

    return NextResponse.json(session);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LiveAvatar sessie mislukt.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

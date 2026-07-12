import { NextResponse } from "next/server";

import { getPublicLiveAvatarFlags } from "@/lib/liveavatar/characters";

export async function GET() {
  return NextResponse.json({
    characters: getPublicLiveAvatarFlags(),
  });
}

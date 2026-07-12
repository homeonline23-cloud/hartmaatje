import { NextRequest, NextResponse } from "next/server";
import {
  buildMemoryContext,
  forgetResident,
} from "@/lib/memory/orchestrator";
import type { AppLang } from "@/lib/languages";

/** GET: preview memory for a resident. DELETE: forget all memory for a resident. */
export async function GET(req: NextRequest) {
  const residentId = req.nextUrl.searchParams.get("resident_id")?.trim() || "guest";
  const lang: AppLang = req.nextUrl.searchParams.get("lang") === "en" ? "en" : "nl";
  const sessionId = req.nextUrl.searchParams.get("session_id")?.trim() || undefined;

  const memory = buildMemoryContext({ residentId, lang, sessionId });
  return NextResponse.json({
    resident_id: residentId,
    profile: memory.profile,
    episodes: memory.episodes,
    session: memory.session,
    prompt_preview: memory.promptBlock,
  });
}

export async function DELETE(req: NextRequest) {
  const residentId = req.nextUrl.searchParams.get("resident_id")?.trim();
  if (!residentId) {
    return NextResponse.json({ error: "resident_id ontbreekt." }, { status: 400 });
  }
  forgetResident(residentId);
  return NextResponse.json({ ok: true, resident_id: residentId });
}

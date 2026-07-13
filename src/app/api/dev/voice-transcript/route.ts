import { NextRequest, NextResponse } from "next/server";

import type { AppLang } from "@/lib/languages";
import {
  appendVoiceTranscript,
  clearVoiceTranscriptLog,
  isVoiceTranscriptLogEnabled,
  readRecentVoiceTranscripts,
} from "@/lib/server/voiceTranscriptLog";
import type { VoiceIdentityId } from "@/lib/voice/types";

export const runtime = "nodejs";

type PostBody = {
  kind?: "line";
  identity_id?: VoiceIdentityId;
  lang?: AppLang;
  session_id?: string;
  role?: "user" | "assistant";
  text?: string;
};

export async function GET() {
  if (!isVoiceTranscriptLogEnabled()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const entries = await readRecentVoiceTranscripts(120);
  return NextResponse.json({ entries, count: entries.length });
}

export async function POST(req: NextRequest) {
  if (!isVoiceTranscriptLogEnabled()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text || !body.role) {
    return NextResponse.json({ error: "Missing text or role" }, { status: 400 });
  }

  await appendVoiceTranscript({
    kind: "line",
    identityId: body.identity_id ?? "fenna",
    lang: body.lang === "en" ? "en" : "nl",
    sessionId: body.session_id?.trim(),
    role: body.role,
    text,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!isVoiceTranscriptLogEnabled()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  await clearVoiceTranscriptLog();
  return NextResponse.json({ ok: true, cleared: true });
}

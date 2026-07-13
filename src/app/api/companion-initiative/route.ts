import { NextRequest, NextResponse } from "next/server";
import type { AppLang } from "@/lib/languages";
import { isAppLang } from "@/lib/languages";
import { generateCompanionInitiative } from "@/lib/server/companionInitiative";
import type { VoiceIdentityId } from "@/lib/voice/types";

const VALID_IDS = new Set<VoiceIdentityId>(["maarten", "peter", "fenna", "colette"]);

type Body = {
  resident_id?: string;
  session_id?: string;
  identity_id?: VoiceIdentityId;
  lang?: AppLang;
};

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const lang: AppLang = body.lang && isAppLang(body.lang) ? body.lang : "nl";
  const identityId = VALID_IDS.has(body.identity_id as VoiceIdentityId)
    ? (body.identity_id as VoiceIdentityId)
    : "fenna";

  try {
    const line = await generateCompanionInitiative({
      residentId: body.resident_id?.trim() || "guest",
      sessionId: body.session_id?.trim(),
      identityId,
      lang,
    });
    return NextResponse.json({ reply: line, identity_id: identityId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Initiatief mislukt.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

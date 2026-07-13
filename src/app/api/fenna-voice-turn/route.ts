import { NextRequest, NextResponse } from "next/server";
import { getAppCopy } from "@/lib/appLocale";
import type { AppLang } from "@/lib/languages";
import { jsonApiError } from "@/lib/server/rateLimitResponse";
import { runCompanionVoiceTurn } from "@/lib/server/fennaVoiceTurn";
import { getVoiceIdentity } from "@/lib/voice/registry";
import type { VoiceIdentityId } from "@/lib/voice/types";
import { isAppLang } from "@/lib/languages";

const VALID_IDS = new Set<VoiceIdentityId>(["maarten", "peter", "fenna", "colette"]);

type Body = {
  audio_base64?: string;
  mime_type?: string;
  lang?: AppLang;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  resident_id?: string;
  session_id?: string;
  identity_id?: string;
  address_form?: "formeel" | "informeel";
};

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const errors = getAppCopy("nl").errors;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: errors.couldNotReadRecording }, { status: 400 });
  }

  const audio = body.audio_base64?.trim();
  if (!audio) {
    return NextResponse.json({ error: errors.couldNotReadRecording }, { status: 400 });
  }

  const lang: AppLang = body.lang && isAppLang(body.lang) ? body.lang : "nl";
  const identityId = VALID_IDS.has(body.identity_id as VoiceIdentityId)
    ? (body.identity_id as VoiceIdentityId)
    : "fenna";

  try {
    const result = await runCompanionVoiceTurn({
      audioBase64: audio,
      mimeType: body.mime_type || "audio/webm",
      lang,
      history: body.history,
      identityId,
      residentId: body.resident_id?.trim() || "guest",
      sessionId: body.session_id?.trim(),
      addressForm: body.address_form === "informeel" ? "informeel" : "formeel",
    });
    return NextResponse.json(result);
  } catch (error) {
    const raw = error instanceof Error ? error.message : errors.speechServiceFailed;
    const name = getVoiceIdentity(identityId).displayName;
    return jsonApiError(raw, lang, 500, name);
  }
}

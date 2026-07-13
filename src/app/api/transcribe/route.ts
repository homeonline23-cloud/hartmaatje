import { NextRequest, NextResponse } from "next/server";
import { getAppCopy } from "@/lib/appLocale";
import type { AppLang } from "@/lib/languages";
import { isAppLang } from "@/lib/languages";
import { normalizeCoreLang } from "@/lib/languages";
import { geminiTranscribeAudio } from "@/lib/server/gemini";

type Body = {
  audio_base64?: string;
  mime_type?: string;
  lang?: AppLang;
};

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
  const text = await geminiTranscribeAudio(
    audio,
    body.mime_type || "audio/webm",
    normalizeCoreLang(lang),
  );

  if (!text) {
    return NextResponse.json(
      { error: getAppCopy(lang).errors.speechServiceFailed },
      { status: 503 },
    );
  }

  return NextResponse.json({ text });
}

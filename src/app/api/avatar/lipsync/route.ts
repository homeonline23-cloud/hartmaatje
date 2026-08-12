import { NextResponse } from "next/server";
import { requestRemoteLipsync } from "@/lib/avatarConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** CPU Wav2Lip can take several minutes */
export const maxDuration = 600;

const ALLOWED = new Set(["fenna", "maarten", "peter", "colette"]);

/**
 * POST /api/avatar/lipsync
 * multipart: audio (file), companion_id (optional form field)
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json(
      { ok: false, error: "audio_required" },
      { status: 400 }
    );
  }

  const rawId = String(form.get("companion_id") || "")
    .trim()
    .toLowerCase();
  const companionId = ALLOWED.has(rawId) ? rawId : undefined;
  const filename =
    "name" in audio && typeof audio.name === "string" && audio.name
      ? audio.name
      : "speech.wav";

  const result = await requestRemoteLipsync({
    audio,
    filename,
    companionId,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

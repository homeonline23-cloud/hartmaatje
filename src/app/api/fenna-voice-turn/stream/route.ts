import { NextRequest } from "next/server";
import { getAppCopy } from "@/lib/appLocale";
import type { AppLang } from "@/lib/languages";
import { isAppLang } from "@/lib/languages";
import { runCompanionVoiceTurnStream } from "@/lib/server/fennaVoiceTurn";
import type { VoiceIdentityId } from "@/lib/voice/types";

const VALID_IDS = new Set<VoiceIdentityId>(["maarten", "peter", "fenna", "colette"]);

export const runtime = "nodejs";
export const maxDuration = 60;

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

export async function POST(req: NextRequest) {
  const errors = getAppCopy("nl").errors;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response(JSON.stringify({ error: errors.couldNotReadRecording }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const audio = body.audio_base64?.trim();
  if (!audio) {
    return new Response(JSON.stringify({ error: errors.couldNotReadRecording }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const lang: AppLang = body.lang && isAppLang(body.lang) ? body.lang : "nl";
  const identityId = VALID_IDS.has(body.identity_id as VoiceIdentityId)
    ? (body.identity_id as VoiceIdentityId)
    : "fenna";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        for await (const event of runCompanionVoiceTurnStream({
          audioBase64: audio,
          mimeType: body.mime_type || "audio/webm",
          lang,
          history: body.history,
          identityId,
          residentId: body.resident_id?.trim() || "guest",
          sessionId: body.session_id?.trim(),
          addressForm: body.address_form === "informeel" ? "informeel" : "formeel",
        })) {
          send(event);
        }
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : errors.speechServiceFailed,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

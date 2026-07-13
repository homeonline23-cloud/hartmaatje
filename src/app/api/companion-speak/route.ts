import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { friendlyGeminiErrorMessage, isGeminiQuotaError } from "@/lib/geminiErrors";
import type { AppLang } from "@/lib/languages";
import { isAppLang } from "@/lib/languages";
import { jsonApiError } from "@/lib/server/rateLimitResponse";
import {
  GEMINI_TTS_MODEL,
  getFemaleTtsVoiceFallbacks,
  getGeminiVoicePrompt,
} from "@/lib/voice/geminiVoiceConfig";
import type { VoiceIdentityId } from "@/lib/voice/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_IDS = new Set<VoiceIdentityId>([
  "maarten",
  "peter",
  "fenna",
  "colette",
]);

function cleanForSpeech(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/^[-•*]\s+/gm, "")
    .replace(/\n+/g, " ")
    .replace(/—/g, ", ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY ontbreekt." },
      { status: 500 },
    );
  }

  try {
    const body = (await req.json()) as {
      text?: string;
      identityId?: VoiceIdentityId;
      identity_id?: VoiceIdentityId;
      lang?: AppLang;
    };

    const text = cleanForSpeech(String(body.text ?? ""));
    if (!text) {
      return NextResponse.json({ error: "Geen tekst om voor te lezen." }, {
        status: 400,
      });
    }

    const rawIdentity = body.identityId ?? body.identity_id;
    const identityId = VALID_IDS.has(rawIdentity as VoiceIdentityId)
      ? (rawIdentity as VoiceIdentityId)
      : "fenna";
    const lang: AppLang = body.lang && isAppLang(body.lang) ? body.lang : "nl";
    const { prompt } = getGeminiVoicePrompt(identityId, lang, text);
    const voiceCandidates = getFemaleTtsVoiceFallbacks(identityId);

    const ai = new GoogleGenAI({ apiKey });
    let audioPart: { inlineData?: { data?: string; mimeType?: string } } | undefined;
    let usedVoice = voiceCandidates[0];

    for (const voiceName of voiceCandidates) {
      console.info("[companion-speak] try", { identityId, voiceName, chars: text.length });
      const result = await ai.models.generateContent({
        model: GEMINI_TTS_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            languageCode:
              lang === "nl"
                ? "nl-NL"
                : lang === "de"
                  ? "de-DE"
                  : lang === "fr"
                    ? "fr-FR"
                    : lang === "es"
                      ? "es-ES"
                      : "en-US",
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const parts = result.candidates?.[0]?.content?.parts ?? [];
      audioPart = parts.find(
        (p) => p.inlineData?.data && p.inlineData.mimeType?.startsWith("audio/"),
      );
      if (audioPart?.inlineData?.data) {
        usedVoice = voiceName;
        break;
      }
    }

    console.info("[companion-speak] ok", { identityId, voiceName: usedVoice });

    if (!audioPart?.inlineData?.data) {
      return NextResponse.json(
        { error: "Geen audio van TTS-model." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      audioBase64: audioPart.inlineData.data,
      mimeType: audioPart.inlineData.mimeType ?? "audio/mp3",
    });
  } catch (error) {
    console.error("companion-speak:", error);
    const raw = error instanceof Error ? error.message : "Spraak genereren mislukt.";
    const lang: AppLang = "nl";
    return jsonApiError(raw, lang, isGeminiQuotaError(raw) ? 429 : 500);
  }
}

import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import type { AppLang } from "@/lib/hartmaatje-api/client";
import {
  FENNA_LIVE_MODELS,
  getFennaLiveSystemInstruction,
} from "@/lib/fenna-voice/fennaLivePrompt";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY ontbreekt in .env.local" },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const lang: AppLang = url.searchParams.get("lang") === "en" ? "en" : "nl";
  const requested = url.searchParams.get("model") ?? "";
  const model = FENNA_LIVE_MODELS.includes(
    requested as (typeof FENNA_LIVE_MODELS)[number],
  )
    ? requested
    : FENNA_LIVE_MODELS[0];

  try {
    const ai = new GoogleGenAI({ apiKey });
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        liveConnectConstraints: {
          model,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Aoede" },
              },
            },
            systemInstruction: getFennaLiveSystemInstruction(lang),
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        },
      },
    });

    if (!token.name) {
      return NextResponse.json(
        { error: "Kon geen live-token maken." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      token: token.name,
      model,
      lang,
      fallbacks: FENNA_LIVE_MODELS.filter((m) => m !== model),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Token fout";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

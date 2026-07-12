const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export type GeminiTurn = {
  role: "user" | "model";
  text: string;
};

export function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  return { apiKey, model };
}

/** Faster model for live voice turns (STT + reply). */
export function getVoiceGeminiConfig() {
  const cfg = getGeminiConfig();
  if (!cfg) return null;
  const model =
    process.env.GEMINI_VOICE_MODEL?.trim() ||
    process.env.GEMINI_STT_MODEL?.trim() ||
    "gemini-2.5-flash-lite";
  return { apiKey: cfg.apiKey, model };
}

/** Low-latency generation — disable thinking on Flash models. */
export function voiceGenerationConfig(options?: {
  maxOutputTokens?: number;
  temperature?: number;
}): Record<string, unknown> {
  const model = getVoiceGeminiConfig()?.model ?? "";
  const config: Record<string, unknown> = {
    temperature: options?.temperature ?? 0.85,
    maxOutputTokens: options?.maxOutputTokens ?? 260,
  };
  if (model.includes("flash")) {
    config.thinkingConfig = { thinkingBudget: 0 };
  }
  return config;
}

/** Gemini accepts simple mime types — strip codec suffixes from MediaRecorder. */
export function normalizeGeminiAudioMime(mimeType: string): string {
  const mime = (mimeType || "audio/webm").split(";")[0]?.trim().toLowerCase();
  if (mime.startsWith("audio/")) return mime;
  return "audio/webm";
}

export async function geminiGenerateText(
  systemPrompt: string,
  turns: GeminiTurn[],
  options?: {
    maxOutputTokens?: number;
    temperature?: number;
    model?: string;
    /** Use low-latency voice settings (thinking off). */
    fast?: boolean;
  },
): Promise<string | null> {
  const cfg = getGeminiConfig();
  if (!cfg) return null;
  const model = options?.model ?? cfg.model;

  const contents = turns.map((t) => ({
    role: t.role,
    parts: [{ text: t.text }],
  }));

  const generationConfig = options?.fast
    ? voiceGenerationConfig({
        temperature: options?.temperature,
        maxOutputTokens: options?.maxOutputTokens,
      })
    : {
        temperature: options?.temperature ?? 0.92,
        maxOutputTokens: options?.maxOutputTokens ?? 480,
      };

  const res = await fetch(
    `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig,
      }),
    },
  );

  if (!res.ok) return null;

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text || null;
}

function sttModelName(cfg: { apiKey: string; model: string }): string {
  return process.env.GEMINI_STT_MODEL?.trim() || cfg.model;
}

function parseLiveVoiceRaw(
  raw: string,
  lang: "nl" | "en",
): { userText: string; reply: string } | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        heard?: string;
        reply?: string;
        gehoord?: string;
        antwoord?: string;
      };
      const userText = (parsed.heard ?? parsed.gehoord ?? "").trim();
      const reply = (parsed.reply ?? parsed.antwoord ?? "").trim();
      if (userText && reply) return { userText, reply };
    } catch {
      /* fall through */
    }
  }

  const heardMatch = cleaned.match(
    lang === "en" ? /HEARD:\s*(.+?)(?:\n|$)/i : /GEHOORD:\s*(.+?)(?:\n|$)/i,
  );
  const replyMatch = cleaned.match(
    lang === "en" ? /REPLY:\s*([\s\S]+)/i : /ANTWOORD:\s*([\s\S]+)/i,
  );

  const userText = heardMatch?.[1]?.trim() ?? "";
  const reply = replyMatch?.[1]?.trim() ?? "";
  if (userText && reply) return { userText, reply };

  return null;
}

/** One Gemini call: audio in → heard text + companion reply. */
export async function geminiLiveVoiceTurn(
  systemPrompt: string,
  history: GeminiTurn[],
  audioBase64: string,
  mimeType: string,
  lang: "nl" | "en",
  characterName = "HartMaatje",
): Promise<{ userText: string; reply: string } | null> {
  const cfg = getVoiceGeminiConfig();
  if (!cfg) return null;

  const formatHint =
    lang === "en"
      ? `The user just spoke (audio). Reply as ${characterName}. You ARE ${characterName}. Transcribe exactly what they said. Return ONLY valid JSON:
{"heard":"<exact transcript>","reply":"<warm short answer — answer first, no interrogation>"}`
      : `De gebruiker sprak net (audio). Antwoord als ${characterName}. U BENT ${characterName}. Schrijf exact op wat ze zeiden. Geef ALLEEN geldige JSON:
{"gehoord":"<exacte transcriptie>","antwoord":"<warm kort antwoord op wat ze zeiden — geen verhoor, maximaal één vraag>"}`;

  const contents: Array<{
    role: string;
    parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  }> = history.map((t) => ({
    role: t.role,
    parts: [{ text: t.text }],
  }));
  contents.push({
    role: "user",
    parts: [
      {
        inlineData: {
          mimeType: normalizeGeminiAudioMime(mimeType),
          data: audioBase64,
        },
      },
      { text: formatHint },
    ],
  });

  const res = await fetch(
    `${GEMINI_BASE}/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: voiceGenerationConfig({
          temperature: 0.68,
          maxOutputTokens: 200,
        }),
      }),
    },
  );

  if (!res.ok) {
    console.warn("[gemini live voice] failed", cfg.model, res.status);
    return null;
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!raw) return null;

  return parseLiveVoiceRaw(raw, lang);
}

export async function geminiTranscribeAudio(
  audioBase64: string,
  mimeType: string,
  lang: "nl" | "en",
  modelOverride?: string,
): Promise<string | null> {
  const cfg = getVoiceGeminiConfig();
  if (!cfg) return null;

  const hint =
    lang === "en"
      ? "Transcribe the spoken message in English. Return only the exact words the person said."
      : "Transcribeer het gesproken bericht in het Nederlands. Geef alleen de exacte woorden terug die de persoon zei.";

  const model = modelOverride ?? sttModelName(cfg);
  const mime = normalizeGeminiAudioMime(mimeType);

  const res = await fetch(
    `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: hint },
              {
                inlineData: {
                  mimeType: mime,
                  data: audioBase64,
                },
              },
            ],
          },
        ],
        generationConfig: voiceGenerationConfig({
          temperature: 0.1,
          maxOutputTokens: 300,
        }),
      }),
    },
  );

  if (!res.ok) {
    console.warn("[gemini STT] failed", model, res.status);
    return null;
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text || null;
}

/** Try multiple models until transcription succeeds. */
export async function geminiTranscribeAudioRobust(
  audioBase64: string,
  mimeType: string,
  lang: "nl" | "en",
): Promise<string | null> {
  const cfg = getGeminiConfig();
  const candidates = [
    process.env.GEMINI_STT_MODEL?.trim(),
    getVoiceGeminiConfig()?.model,
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    cfg?.model,
  ].filter((m): m is string => Boolean(m));

  const models = [...new Set(candidates)];
  for (const model of models) {
    const text = await geminiTranscribeAudio(audioBase64, mimeType, lang, model);
    if (text?.trim()) return text.trim();
  }
  return null;
}

import { NextResponse } from "next/server";
import {
  greetingReply,
  isShortGreeting,
  systemPrompt,
  type ChatMessage,
} from "@/lib/ollamaChat";
import { getOllamaHost, getOllamaModel } from "@/lib/ollamaConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  messages?: ChatMessage[];
  text?: string;
  companionId?: string;
  locale?: string;
  sessionId?: string;
};

function encodeLine(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + "\n");
}

/** Synthetic Ollama-shaped NDJSON for local greeting shortcuts. */
function ollamaLikeReplyStream(content: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(
        encodeLine({
          message: { role: "assistant", content },
          done: false,
        })
      );
      controller.enqueue(
        encodeLine({
          message: { role: "assistant", content: "" },
          done: true,
        })
      );
      controller.close();
    },
  });
}

/**
 * Pipes Ollama (local or remote Hetzner) stream:true to the frontend as NDJSON.
 * Does not call TTS — the client POSTs to Python /speak after the stream ends.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const companionId = String(body.companionId || "fenna");
    const locale = String(body.locale || "nl-NL");
    const text = String(body.text || "").trim();

    const incoming = Array.isArray(body.messages) ? body.messages : [];
    const history = incoming
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          String(m.content || "").trim()
      )
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content).replace(/\s+/g, " ").trim(),
      }));

    // Latest user turn: explicit `text` or last user message in `messages`
    const latestUser =
      text ||
      [...history].reverse().find((m) => m.role === "user")?.content ||
      "";

    if (!latestUser) {
      return NextResponse.json({ error: "empty_text" }, { status: 400 });
    }

    // Fast greetings — still Ollama-shaped so the frontend reader stays one path
    if (isShortGreeting(latestUser)) {
      const reply = greetingReply(latestUser, companionId, locale);
      return new NextResponse(ollamaLikeReplyStream(reply), {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // 1. Inject fluid system prompt at index 0
    const systemMessage: ChatMessage = {
      role: "system",
      content: systemPrompt(companionId, locale),
    };

    // Prior turns only (drop trailing duplicate of latest user if present)
    let prior = history;
    if (
      text &&
      prior.length &&
      prior[prior.length - 1]?.role === "user" &&
      prior[prior.length - 1]?.content === text
    ) {
      prior = prior.slice(0, -1);
    }

    // 2. Rolling window: system + last 6 turns (12 messages) + current user
    const rollingHistory: ChatMessage[] = [
      systemMessage,
      ...prior.slice(-12),
      { role: "user", content: latestUser },
    ];

    const ollamaHost = getOllamaHost();
    const model = getOllamaModel();

    // 3. Call Ollama (PC-local or remote Hetzner — set OLLAMA_HOST)
    const ollamaResponse = await fetch(`${ollamaHost}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: rollingHistory,
        stream: true,
        options: {
          num_ctx: 2048,
          temperature: 0.65,
          top_p: 0.9,
          num_predict: 40,
          repeat_penalty: 1.25,
        },
        keep_alive: "30m",
      }),
    });

    if (!ollamaResponse.ok || !ollamaResponse.body) {
      const detail = await ollamaResponse.text().catch(() => "");
      return NextResponse.json(
        {
          error: "ollama_failed",
          host: ollamaHost,
          model,
          detail: detail.slice(0, 200),
        },
        { status: 502 }
      );
    }

    // 4. Return the stream directly to the frontend (raw Ollama NDJSON)
    return new NextResponse(ollamaResponse.body, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "X-Ollama-Host": ollamaHost,
        "X-Ollama-Model": model,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "chat_failed";
    return NextResponse.json(
      { error: message, host: getOllamaHost(), model: getOllamaModel() },
      { status: 500 }
    );
  }
}

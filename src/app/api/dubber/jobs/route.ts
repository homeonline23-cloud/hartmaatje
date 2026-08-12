import { NextResponse } from "next/server";
import { dubberUrls } from "@/lib/dubberApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Forward multipart upload to the dubber API (local FastAPI or live relay). */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const upstream = await fetch(dubberUrls().jobs, {
      method: "POST",
      body: form,
    });
    const text = await upstream.text();
    let data: unknown = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text || "Upstream error" };
    }
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    return NextResponse.json(
      {
        detail:
          err instanceof Error ? err.message : "Could not reach dubber service",
      },
      { status: 502 }
    );
  }
}

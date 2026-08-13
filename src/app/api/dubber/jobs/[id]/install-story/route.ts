import { NextResponse } from "next/server";
import { dubberUrls } from "@/lib/dubberApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const form = await req.formData();
    const upstream = await fetch(dubberUrls().installStory(id), {
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

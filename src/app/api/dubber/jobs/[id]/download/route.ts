import { NextResponse } from "next/server";
import { dubberUrls } from "@/lib/dubberApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const lang = new URL(req.url).searchParams.get("lang") || "";
    const url = lang
      ? `${dubberUrls().download(id)}?lang=${encodeURIComponent(lang)}`
      : dubberUrls().download(id);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { detail: detail || "Download failed" },
        { status: res.status }
      );
    }
    const buf = await res.arrayBuffer();
    const disposition =
      res.headers.get("content-disposition") ||
      `attachment; filename="hartmaatje-dub-${id}.mp4"`;
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": disposition,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        detail: err instanceof Error ? err.message : "Dubber API unreachable",
      },
      { status: 502 }
    );
  }
}

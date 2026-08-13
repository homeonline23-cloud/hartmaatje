import { NextResponse } from "next/server";
import { getAvatarApiUrl } from "@/lib/avatarConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ name: string }> };

/**
 * GET /api/avatar/video/[name]
 * Proxy rendered MP4 from Hetzner so the browser never talks to :8091 directly.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { name: raw } = await ctx.params;
  const name = decodeURIComponent(raw || "").replace(/[^a-zA-Z0-9._-]/g, "");
  if (!name || !name.endsWith(".mp4")) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  const url = `${getAvatarApiUrl()}/output/${encodeURIComponent(name)}`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      return NextResponse.json(
        { error: `upstream_${res.status}` },
        { status: res.status === 404 ? 404 : 502 }
      );
    }
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "proxy_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

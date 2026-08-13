import { NextResponse } from "next/server";
import { dubberUrls } from "@/lib/dubberApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const urls = dubberUrls();
    const res = await fetch(urls.health, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      upstream?: { ok?: boolean };
    };
    // Relay returns { ok, upstream }; FastAPI returns { ok, service }
    const ok = Boolean(
      res.ok && (urls.relay ? data.ok && data.upstream?.ok !== false : data.ok !== false)
    );
    return NextResponse.json(
      { ok, upstream: data },
      { status: ok ? 200 : 502 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Dubber API unreachable",
      },
      { status: 502 }
    );
  }
}

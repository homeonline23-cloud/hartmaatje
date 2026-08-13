import { NextResponse } from "next/server";
import { dubberUrls } from "@/lib/dubberApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const res = await fetch(dubberUrls().job(id), { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      {
        detail: err instanceof Error ? err.message : "Dubber API unreachable",
      },
      { status: 502 }
    );
  }
}

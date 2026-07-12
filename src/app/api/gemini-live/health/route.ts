import { NextResponse } from "next/server";

export async function GET() {
  const ok = Boolean(process.env.GEMINI_API_KEY?.trim());
  return NextResponse.json({ ok });
}

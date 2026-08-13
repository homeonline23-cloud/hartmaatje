import type { NextRequest } from "next/server";
import { POST as chatPost } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Back-compat alias — same raw Ollama pipe as `/api/chat`. */
export async function POST(req: NextRequest) {
  return chatPost(req);
}

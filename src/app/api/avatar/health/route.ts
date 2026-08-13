import { NextResponse } from "next/server";
import { pingAvatar } from "@/lib/avatarConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/avatar/health — is the Hetzner Wav2Lip avatar API reachable? */
export async function GET() {
  const result = await pingAvatar();
  const status = result.ok ? 200 : 503;
  const hint = result.ok
    ? "Avatar API OK. Next step: lipsync when companion speaks."
    : result.remote
      ? "Hetzner avatar unreachable. Check firewall TCP 8091 and that the avatar server is running."
      : "Local avatar unreachable. Set AVATAR_API_URL to your Hetzner URL in apps/web/.env.local";

  return NextResponse.json({ ...result, hint }, { status });
}

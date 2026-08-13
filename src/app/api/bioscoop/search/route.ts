import { NextRequest, NextResponse } from "next/server";

/**
 * Live YouTube search for Bioscoop Kamer — used only when a spoken wish
 * matches none of the 8 pinned categories. Keeps the API key server-side.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type YouTubeSearchItem = {
  id?: { videoId?: string };
  snippet?: { title?: string; channelTitle?: string };
};

type YouTubeSearchResponse = {
  items?: YouTubeSearchItem[];
};

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const lang = (req.nextUrl.searchParams.get("lang") || "nl").slice(0, 2);

  if (!q) {
    return NextResponse.json(
      { ok: false, error: "query_required" },
      { status: 400 }
    );
  }

  const apiKey = (process.env.YOUTUBE_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "no_api_key" },
      { status: 503 }
    );
  }

  const params = new URLSearchParams({
    part: "snippet",
    q,
    type: "video",
    videoEmbeddable: "true",
    safeSearch: "strict",
    maxResults: "1",
    relevanceLanguage: lang,
    key: apiKey,
  });

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "youtube_error" },
        { status: 502 }
      );
    }
    const data = (await res.json()) as YouTubeSearchResponse;
    const item = data.items?.[0];
    const videoId = item?.id?.videoId;
    if (!videoId) {
      return NextResponse.json(
        { ok: false, error: "no_results" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      ok: true,
      videoId,
      title: item?.snippet?.title || q,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "network_error" },
      { status: 502 }
    );
  }
}

import type { AppLang } from "@/i18n/config";

export type BioscoopSearchResult = { videoId: string; title: string };

/**
 * Live YouTube search fallback for Bioscoop Kamer — only called when a
 * spoken wish matches none of the 8 pinned categories. Hits our own
 * server route so the API key never reaches the browser.
 */
export async function searchBioscoopVideo(
  query: string,
  lang: AppLang
): Promise<BioscoopSearchResult | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const res = await fetch(
      `/api/bioscoop/search?q=${encodeURIComponent(q)}&lang=${lang}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      videoId?: string;
      title?: string;
    };
    if (!data.ok || !data.videoId) return null;
    return { videoId: data.videoId, title: data.title || q };
  } catch {
    return null;
  }
}

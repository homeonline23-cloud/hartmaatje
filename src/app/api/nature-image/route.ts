import { NextRequest, NextResponse } from "next/server";

type NatureScene =
  | {
      kind: "live";
      embedUrl: string;
      alt: string;
      credit?: string;
    }
  | {
      kind: "image";
      url: string;
      alt: string;
      credit?: string;
    };

type LiveStream = {
  videoId: string;
  altNl: string;
  altEn: string;
  credit: string;
};

/** 24/7 live natuurstreams — echt live beeld, geen stilstaande foto's. */
const LIVE_NATURE_STREAMS: LiveStream[] = [
  {
    videoId: "F0GOOP82094",
    altNl: "Live bos met wilde dieren",
    altEn: "Live forest with wildlife",
    credit: "Nature Live Camera — live stream",
  },
  {
    videoId: "RnCAl0mQgqA",
    altNl: "Live vogels in het bos",
    altEn: "Live birds in the forest",
    credit: "Nature Live Camera — live stream",
  },
];

const FALLBACK_IMAGES: Array<{
  url: string;
  altNl: string;
  altEn: string;
  credit: string;
}> = [
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_lake.jpg/1280px-Fronalpstock_lake.jpg",
    altNl: "Bergmeer in de Alpen",
    altEn: "Alpine mountain lake",
    credit: "Wikimedia Commons",
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Keukenhof%2C_tulip_fields.jpg/1280px-Keukenhof%2C_tulip_fields.jpg",
    altNl: "Tulpenveld in Nederland",
    altEn: "Tulip fields in the Netherlands",
    credit: "Wikimedia Commons",
  },
];

function youtubeEmbed(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    playsinline: "1",
    rel: "0",
    controls: "1",
    modestbranding: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function pickLive(lang: "nl" | "en"): NatureScene {
  const stream =
    LIVE_NATURE_STREAMS[
      Math.floor(Math.random() * LIVE_NATURE_STREAMS.length)
    ]!;
  return {
    kind: "live",
    embedUrl: youtubeEmbed(stream.videoId),
    alt: lang === "en" ? stream.altEn : stream.altNl,
    credit: stream.credit,
  };
}

function pickFallbackImage(lang: "nl" | "en"): NatureScene {
  const image =
    FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)]!;
  return {
    kind: "image",
    url: image.url,
    alt: lang === "en" ? image.altEn : image.altNl,
    credit: image.credit,
  };
}

export async function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get("lang") === "en" ? "en" : "nl";
  const mode = req.nextUrl.searchParams.get("mode");

  if (mode === "fallback-image") {
    return NextResponse.json(pickFallbackImage(lang));
  }

  return NextResponse.json(pickLive(lang));
}

"use client";

import { useEffect, useState, type RefObject } from "react";
import {
  activeCaptionText,
  type CaptionCue,
} from "@/lib/videoCaptions";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  cues: CaptionCue[];
  /** Shown under captions when spoken audio is not in the selected language */
  fallbackHint?: string | null;
};

/** Large senior-friendly caption overlay synced to video currentTime. */
export function VideoCaptionOverlay({
  videoRef,
  cues,
  fallbackHint,
}: Props) {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const tick = () => setTime(el.currentTime || 0);

    tick();
    el.addEventListener("timeupdate", tick);
    el.addEventListener("seeked", tick);
    el.addEventListener("play", tick);
    return () => {
      el.removeEventListener("timeupdate", tick);
      el.removeEventListener("seeked", tick);
      el.removeEventListener("play", tick);
    };
  }, [videoRef, cues]);

  // Derived during render — no extra state or effect needed.
  const text = activeCaptionText(cues, time);

  if (!text && !fallbackHint) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 px-3 pb-4 pt-10 bg-gradient-to-t from-black/55 via-black/25 to-transparent">
      {fallbackHint ? (
        <p className="rounded-full bg-black/50 px-3 py-1 text-center text-xs font-semibold text-white/90 sm:text-sm">
          {fallbackHint}
        </p>
      ) : null}
      {text ? (
        <p className="max-w-[95%] rounded-2xl bg-black/70 px-4 py-2.5 text-center text-base font-semibold leading-snug text-white shadow-md sm:text-lg">
          {text}
        </p>
      ) : null}
    </div>
  );
}

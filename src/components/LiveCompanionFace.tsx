"use client";

import Image from "next/image";
import { useEffect, useRef, type RefObject } from "react";
import { WelcomeVideoFrame } from "@/components/WelcomeVideoFrame";
import type { CompanionId } from "@/lib/companions";

export type LiveFaceMode = "idle" | "listening" | "speaking";

type Props = {
  companionId: CompanionId;
  companionName: string;
  /** Pristine portrait URL, e.g. /avatars/fenna/portrait.png?v=3 */
  portrait: string;
  speaking?: boolean;
  speechLevel?: number;
  /** Mic is on — show listening face when not speaking */
  listening?: boolean;
  /** Prefer talk.mp4 / listening.mp4 over static portrait (live character) */
  liveCharacter?: boolean;
  portraitCrop?: { scale: string; position: string } | null;
  /** Tighter height (Verhalen kamer idle) */
  compact?: boolean;
  /** Full-stage height while a story is being read aloud */
  expanded?: boolean;
  /**
   * Your full dubbed story video (or legacy mute face clip).
   * When `storyVideoWithAudio` is true, this IS the show — picture + voice.
   */
  storyVideoSrc?: string | null;
  storyVideoRef?: RefObject<HTMLVideoElement | null>;
  /** Play sound from the video (user-made dub). Do not loop. */
  storyVideoWithAudio?: boolean;
};

function faceClip(companionId: CompanionId, mode: LiveFaceMode): string | null {
  if (mode === "speaking") return `/avatars/${companionId}/talk.mp4`;
  if (mode === "listening") return `/avatars/${companionId}/listening.mp4`;
  return `/avatars/${companionId}/welcome.mp4`;
}

/**
 * Living companion face.
 * - Story dub: full video with audio when provided
 * - Live character: looping talk/listening clips (muted) while voice chat runs
 * - Else: portrait
 */
export function LiveCompanionFace({
  companionId,
  companionName,
  portrait,
  speaking = false,
  speechLevel = 0,
  listening = false,
  liveCharacter = false,
  portraitCrop = null,
  compact = false,
  expanded = false,
  storyVideoSrc = null,
  storyVideoRef,
  storyVideoWithAudio = false,
}: Props) {
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const isTalking = Boolean(speaking);
  const mode: LiveFaceMode = isTalking
    ? "speaking"
    : listening
      ? "listening"
      : "idle";
  const showStoryVideo = Boolean(storyVideoSrc);
  const liveClip = !showStoryVideo && liveCharacter ? faceClip(companionId, mode) : null;
  const src =
    portrait?.trim() || `/avatars/${companionId}/portrait.png`;
  const cropClass = portraitCrop
    ? `${portraitCrop.scale} ${portraitCrop.position} object-cover`
    : "object-cover object-[center_18%]";
  const frameSize = expanded
    ? "max-h-[min(78vh,46rem)] max-w-5xl"
    : compact
      ? "max-h-[28vh] max-w-md"
      : "max-h-[42vh] max-w-xl";
  const frameAspect = expanded ? "aspect-[4/5] sm:aspect-video" : "aspect-video";
  // Calm presence — barely breathe with voice (was too twitchy)
  const pulse =
    isTalking && speechLevel > 0.12
      ? Math.min(1.018, 1.006 + speechLevel * 0.02)
      : isTalking
        ? 1.008
        : 1;

  // Slow the face loop; nudge rate with real speech energy so mouth isn't "random"
  useEffect(() => {
    const v = liveVideoRef.current;
    if (!v || !liveClip) return;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    if (!v.getAttribute("src") || v.getAttribute("src") !== liveClip) {
      v.src = liveClip;
      v.load();
    }

    if (mode === "speaking") {
      // Quiet gaps in her voice → almost freeze; energy → slow talk motion
      if (speechLevel < 0.1) {
        v.playbackRate = 0.35;
        if (!v.paused) v.pause();
      } else {
        v.playbackRate = Math.min(0.85, 0.55 + speechLevel * 0.35);
        if (v.paused) void v.play().catch(() => undefined);
      }
    } else if (mode === "listening") {
      v.playbackRate = 0.45;
      if (v.paused) void v.play().catch(() => undefined);
    } else {
      v.playbackRate = 0.4;
      if (!v.paused) v.pause();
    }
  }, [liveClip, companionId, mode, speechLevel]);

  return (
    <div
      className={`hm-dark w-full ${
        expanded ? "px-2 py-3 sm:px-4 sm:py-4" : "px-2 py-2 sm:px-3 sm:py-2.5"
      }`}
    >
      <div
        className="mx-auto w-full transition-transform duration-500 ease-out will-change-transform"
        style={{ transform: `scale(${pulse})` }}
      >
      <WelcomeVideoFrame
        className={`relative w-full ${frameAspect} ${frameSize} ${
          isTalking
            ? "ring-2 ring-[#ffd2a6]/90 ring-offset-2 ring-offset-[var(--hm-dark)]"
            : listening
              ? "ring-2 ring-white/35 ring-offset-2 ring-offset-[var(--hm-dark)]"
              : "ring-0 ring-offset-0"
        }`}
        maskKey={`live-portrait-${companionId}`}
        scoopRadius={expanded ? 0.18 : 0.26}
      >
        <div className="relative h-full w-full overflow-hidden bg-transparent">
          <video
            ref={storyVideoRef}
            className={`absolute inset-0 h-full w-full object-cover object-center ${
              showStoryVideo ? "z-10" : "hidden"
            }`}
            src={storyVideoSrc ?? undefined}
            muted={!storyVideoWithAudio}
            playsInline
            loop={!storyVideoWithAudio}
            preload="auto"
            controls={showStoryVideo && storyVideoWithAudio}
          />
          {!showStoryVideo && liveClip ? (
            <video
              key={`live-${companionId}-${mode}`}
              ref={liveVideoRef}
              className={`h-full w-full ${cropClass}`}
              src={liveClip}
              muted
              playsInline
              loop
              autoPlay
              preload="auto"
              controls={false}
              aria-label={`${companionName} ${mode}`}
              onError={(event) => {
                const el = event.currentTarget;
                const fallback = `/avatars/${companionId}/welcome.mp4`;
                if (el.getAttribute("src") !== fallback) {
                  el.src = fallback;
                  el.load();
                  void el.play().catch(() => undefined);
                }
              }}
            />
          ) : null}
          {!showStoryVideo && !liveClip ? (
            <Image
              src={src}
              alt={companionName}
              fill
              unoptimized
              priority
              className={`${cropClass} transition-opacity duration-300 ease-out ${
                isTalking ? "opacity-100" : "opacity-95"
              }`}
              sizes="(max-width: 768px) 100vw, 720px"
            />
          ) : null}
        </div>
      </WelcomeVideoFrame>
      </div>
      <p className="mt-2 text-center text-lg font-bold text-white sm:text-xl">
        {companionName}
      </p>
    </div>
  );
}

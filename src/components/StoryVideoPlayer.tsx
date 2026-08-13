"use client";

import { useRef, useState } from "react";
import { WelcomeVideoFrame } from "@/components/WelcomeVideoFrame";
import { useI18n } from "@/i18n/LanguageProvider";
import { resolveStoryMedia } from "@/lib/mediaByLang";

type StoryVideoPlayerProps = {
  poster?: string;
  ariaLabel: string;
  playLabel: string;
  /** Optional fixed source; defaults to language story video. */
  src?: string;
  /** Optional full-cover image layered in front of the video before playback starts. */
  coverImage?: string;
};

/** Big clear play button over story video (senior-friendly). */
export function StoryVideoPlayer({
  poster,
  ariaLabel,
  playLabel,
  src,
  coverImage,
}: StoryVideoPlayerProps) {
  const { lang } = useI18n();
  const media = resolveStoryMedia(lang);
  const videoSrc = src ?? media.videoSrc;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [showPlay, setShowPlay] = useState(true);

  const play = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.play();
      setPlaying(true);
      setShowPlay(false);
    } catch {
      setShowPlay(true);
    }
  };

  const toggle = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      await play();
    } else {
      video.pause();
      setPlaying(false);
      setShowPlay(true);
    }
  };

  return (
    <WelcomeVideoFrame className="relative aspect-video w-full">
      <video
        ref={videoRef}
        key={`story-${lang}-${videoSrc}`}
        className="h-full w-full object-cover"
        controls={playing}
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={ariaLabel}
        onPlay={() => {
          setPlaying(true);
          setShowPlay(false);
        }}
        onPause={() => {
          setPlaying(false);
          setShowPlay(true);
        }}
        onEnded={() => {
          setPlaying(false);
          setShowPlay(true);
        }}
        onClick={() => {
          void toggle();
        }}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      {showPlay && coverImage ? (
        <div
          className="pointer-events-none absolute inset-0 z-[5]"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${coverImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      ) : null}

      {showPlay ? (
        <button
          type="button"
          onClick={() => void play()}
          className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--hm-dark)]/20 transition hover:bg-[var(--hm-dark)]/30"
          aria-label={playLabel}
        >
          <span className="hm-dark flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition hover:scale-105 active:scale-95 sm:h-16 sm:w-16">
            <svg
              viewBox="0 0 24 24"
              className="ml-0.5 h-7 w-7 fill-current sm:h-8 sm:w-8"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      ) : null}
    </WelcomeVideoFrame>
  );
}

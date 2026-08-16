"use client";

import { useEffect, useRef, useState } from "react";
import { WelcomeVideoFrame } from "@/components/WelcomeVideoFrame";
import { useI18n } from "@/i18n/LanguageProvider";
import { silenceHmMedia } from "@/lib/hmMedia";
import { resolveIntroMedia } from "@/lib/mediaByLang";

/** Frontpage intro — silent until the user presses play. */
export function FrontpageIntroPlayer() {
  const { lang, t } = useI18n();
  const media = resolveIntroMedia(lang);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [showPlay, setShowPlay] = useState(true);

  useEffect(() => {
    // Stop leftover companion/story speech when landing on the homepage
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    silenceHmMedia();

    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;
    }
    return () => {
      if (!video) return;
      video.pause();
      video.muted = true;
    };
  }, []);

  const play = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      // Only this intro should speak — kill any background voices first
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }
      silenceHmMedia();
      video.muted = false;
      video.defaultMuted = false;
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
    <WelcomeVideoFrame className="relative aspect-video w-full max-w-md mx-auto shadow-[0_8px_28px_rgba(0,0,0,0.45)]">
      <video
        ref={videoRef}
        key={`intro-${lang}-${media.videoSrc}`}
        src={media.videoSrc}
        className="h-full w-full object-cover"
        controls={playing}
        playsInline
        muted
        preload="metadata"
        aria-label={t.cover.introAria}
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
      />

      {showPlay ? (
        // "Home" graphic covers the frame before playback starts.
        <div
          className="pointer-events-none absolute inset-0 z-[5]"
          aria-hidden="true"
          style={{
            backgroundImage: "url(/images/home-intro-poster.jpg)",
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
          aria-label={t.cover.introPlay}
        >
          <span className="hm-dark flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition hover:scale-105 active:scale-95 sm:h-14 sm:w-14">
            <svg
              viewBox="0 0 24 24"
              className="ml-0.5 h-6 w-6 fill-current sm:h-7 sm:w-7"
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

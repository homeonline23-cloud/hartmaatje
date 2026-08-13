"use client";

import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BackToSettingsLink } from "@/components/BackToSettingsLink";
import { WelcomeVideoFrame } from "@/components/WelcomeVideoFrame";
import { useI18n } from "@/i18n/LanguageProvider";
import { resolvePrivacyPolicyMedia } from "@/lib/mediaByLang";
import { getPrivacyContent } from "@/lib/privacyContent";

/** A touch slower than realtime — privacy should feel calm, not rushed. */
const PRIVACY_PLAYBACK_RATE = 0.88;

/** Same silent-until-tap look as the homepage intro video. Dubbed per active language. */
function PrivacyPolicyVideo({ videoSrc }: { videoSrc: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPlay, setShowPlay] = useState(true);

  const applyCalmPace = (video: HTMLVideoElement) => {
    video.playbackRate = PRIVACY_PLAYBACK_RATE;
    video.defaultPlaybackRate = PRIVACY_PLAYBACK_RATE;
  };

  const play = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.muted = false;
      applyCalmPace(video);
      await video.play();
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
      setShowPlay(true);
    }
  };

  return (
    <WelcomeVideoFrame className="relative aspect-video w-full max-w-md mx-auto shadow-[0_8px_28px_rgba(0,0,0,0.45)]">
      <video
        ref={videoRef}
        key={videoSrc}
        src={videoSrc}
        poster="/images/privacy-policy-poster.png"
        className="h-full w-full object-cover"
        controls={!showPlay}
        playsInline
        muted
        preload="metadata"
        aria-label="Privacy Policy video"
        onLoadedMetadata={(e) => applyCalmPace(e.currentTarget)}
        onPlay={() => {
          const v = videoRef.current;
          if (v) applyCalmPace(v);
          setShowPlay(false);
        }}
        onPause={() => setShowPlay(true)}
        onEnded={() => setShowPlay(true)}
        onClick={() => void toggle()}
      />

      {showPlay ? (
        <button
          type="button"
          onClick={() => void play()}
          className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--hm-dark)]/20 transition hover:bg-[var(--hm-dark)]/30"
          aria-label="Play privacy policy video"
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

export default function PrivacyPage() {
  const { lang } = useI18n();
  const p = getPrivacyContent(lang);
  const privacyMedia = resolvePrivacyPolicyMedia(lang);

  return (
    <AppShell>
      <article className="pb-20 sm:pb-24">
        <section className="hm-card space-y-4 px-4 pt-3.5 pb-10 sm:px-5 sm:pt-4 sm:pb-12">
          <header className="relative flex items-start justify-between gap-3 text-left">
            <div className="min-w-0">
              <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold leading-tight text-[#3f6339] sm:text-2xl">
                {p.title}
              </h2>
              <p className="mt-1 text-sm text-[#3f6339]">{p.updated}</p>
            </div>
            <div className="shrink-0">
              <BackToSettingsLink />
            </div>
          </header>

          <PrivacyPolicyVideo videoSrc={privacyMedia.videoSrc} />
        </section>
      </article>
    </AppShell>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { WelcomeVideoFrame } from "@/components/WelcomeVideoFrame";
import { useI18n } from "@/i18n/LanguageProvider";
import {
  getCompanion,
  type CompanionId,
} from "@/lib/companions";
import { silenceHmMedia } from "@/lib/hmMedia";
import { resolveWelcomeMedia } from "@/lib/mediaByLang";

type Props = {
  companionId: CompanionId;
  companionName: string;
  continueLabel: string;
  onContinue: () => void;
};

/** Short welcome clip — companion introduces themselves before the mic. */
export function CompanionWelcomeIntro({
  companionId,
  companionName,
  continueLabel,
  onContinue,
}: Props) {
  const { lang, t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const finishedRef = useRef(false);
  const media = resolveWelcomeMedia(companionId, lang);
  const portrait = getCompanion(companionId)?.portrait;
  const [videoFailed, setVideoFailed] = useState(false);

  const stopVideo = () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      el.pause();
      el.muted = true;
      el.removeAttribute("src");
      el.load();
    } catch {
      /* ignore */
    }
  };

  const finishIntro = () => {
    // Button + onEnded can both fire — only continue once
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopVideo();
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    silenceHmMedia();
    onContinue();
  };

  useEffect(() => {
    finishedRef.current = false;
    setVideoFailed(false);
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    silenceHmMedia();

    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    el.currentTime = 0;
    void el.play().catch(() => {
      /* autoplay may need a tap — Continue still works */
    });

    const watchdog = window.setTimeout(() => {
      if (!el || finishedRef.current) return;
      if (el.readyState < 2 || el.paused) {
        setVideoFailed(true);
      }
    }, 4000);

    return () => {
      window.clearTimeout(watchdog);
      try {
        el.pause();
        el.muted = true;
      } catch {
        /* ignore */
      }
    };
  }, [media.videoSrc, lang]);

  return (
    <section className="hm-card mx-auto w-full overflow-hidden">
      <div className="relative z-30 flex flex-col items-center gap-2 border-b border-[#e8dfd0]/55 px-3 py-2.5 sm:flex-row sm:justify-between">
        <p className="text-lg font-semibold text-[#3f6339] sm:text-xl">
          {companionName}
        </p>
        <button
          type="button"
          onClick={finishIntro}
          className="relative z-40 w-full shrink-0 rounded-xl hm-dark px-4 py-2.5 text-base font-bold shadow-md transition hover:brightness-110 active:scale-[0.98] sm:w-auto sm:px-5 sm:text-lg"
        >
          {continueLabel}
        </button>
      </div>

      <div className="hm-dark flex items-center justify-center px-2 py-2 sm:px-3 sm:py-2.5">
        {videoFailed && portrait ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="relative h-28 w-28 overflow-hidden rounded-full bg-[#e8dfd0] ring-2 ring-white/40 shadow-md sm:h-32 sm:w-32">
              <Image
                src={portrait}
                alt={companionName}
                fill
                unoptimized
                className="object-cover object-top"
                sizes="128px"
              />
            </div>
            <p className="text-center text-base font-semibold text-white/95">
              {companionName}
            </p>
            <button
              type="button"
              onClick={finishIntro}
              className="rounded-xl bg-white px-4 py-2.5 text-base font-bold text-[var(--hm-dark)] shadow-md"
            >
              {continueLabel}
            </button>
          </div>
        ) : (
          <WelcomeVideoFrame
            className="relative mx-auto aspect-video w-full max-h-[42vh]"
            maskKey={companionId}
            scoopRadius={0.26}
          >
            <video
              ref={videoRef}
              key={`${companionId}-${lang}-${media.videoSrc}`}
              src={media.videoSrc}
              /* Same as filmed — never stretch / zoom heads off */
              /* Fill the frame — no black/green side bars */
              className="!h-full !w-full object-cover object-center"
              playsInline
              controls={false}
              preload="auto"
              onEnded={finishIntro}
              onError={() => setVideoFailed(true)}
              onLoadedData={() => {
                const el = videoRef.current;
                if (!el) return;
                void el.play().catch(() => undefined);
              }}
              aria-label={t.media.welcomeAria(companionName)}
            />
          </WelcomeVideoFrame>
        )}
      </div>
    </section>
  );
}

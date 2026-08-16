"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LiveCompanionFace } from "@/components/LiveCompanionFace";
import { companions, type CompanionId } from "@/lib/companions";
import { STORIES, getStory, type StoryId } from "@/lib/stories";
import { getStoryText } from "@/lib/storyText";
import { getVoiceVolume } from "@/lib/voiceVolume";
import { MEDIA_VERSION, companionStoryDubPath } from "@/lib/mediaByLang";
import { createTrackedAudio, silenceHmMedia } from "@/lib/hmMedia";
import { useI18n } from "@/i18n/LanguageProvider";
import type { AppLang } from "@/i18n/config";

function SpeakerIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function StopIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  );
}

function companionVideoPaths(
  storyId: StoryId,
  companionId: CompanionId,
  lang: AppLang
): string[] {
  return [
    companionStoryDubPath(storyId, companionId, lang),
    `/stories/${storyId}/${lang}/${companionId}.mp4`,
  ];
}

function companionAudioPath(
  storyId: StoryId,
  companionId: CompanionId,
  lang: AppLang
): string {
  return `/stories/${storyId}/${lang}/${companionId}.mp3?${MEDIA_VERSION}`;
}

export function StoryReader() {
  const { t, lang } = useI18n();
  const firstPlayable =
    STORIES.find((s) => s.playable)?.id ?? STORIES[0].id;
  const [storyId, setStoryId] = useState<StoryId>(firstPlayable);
  /** No face until the user picks a companion */
  const [companionId, setCompanionId] = useState<CompanionId | null>(null);
  const [reading, setReading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [activeVideoSrc, setActiveVideoSrc] = useState<string | null>(null);
  const [storyWithAudio, setStoryWithAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playingRef = useRef(false);
  const candidatesRef = useRef<string[]>([]);
  const candidateIndexRef = useRef(0);
  const mp3SrcRef = useRef<string | null>(null);
  const visualFallbackRef = useRef<string[]>([]);
  const mp3ModeRef = useRef(false);

  const story = getStory(storyId);
  const text = story ? getStoryText(story, lang) : null;
  const companion = companionId
    ? companions.find((c) => c.id === companionId) ?? null
    : null;

  const stopReading = () => {
    playingRef.current = false;
    // Kill ALL story players (including orphaned Audio() after refresh)
    silenceHmMedia("story");
    const a = audioRef.current;
    if (a) {
      a.onended = null;
      a.onerror = null;
      audioRef.current = null;
    }
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
    setReading(false);
    setStatus(null);
    setActiveVideoSrc(null);
    setStoryWithAudio(false);
    mp3ModeRef.current = false;
  };

  // Kill leftover audio when opening Verhalen; Stop must always work
  useEffect(() => {
    silenceHmMedia();
  }, []);

  // Typing anywhere should stop story reading (user was stuck hearing Fenna while typing)
  useEffect(() => {
    const onType = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement | null)?.isContentEditable) {
        stopReading();
      }
    };
    window.addEventListener("keydown", onType);
    return () => window.removeEventListener("keydown", onType);
  }, []);

  useEffect(() => {
    return () => {
      playingRef.current = false;
      silenceHmMedia("story");
      audioRef.current = null;
    };
  }, []);

  // Changing language / companion / story while playing stops audio
  useEffect(() => {
    if (playingRef.current) stopReading();
  }, [lang, companionId, storyId]);

  const selectStory = (id: StoryId) => {
    stopReading();
    setStoryId(id);
  };

  const readAloud = () => {
    if (!companionId || !companion) {
      setStatus(t.stories.pickCompanion);
      return;
    }
    if (!story?.playable) {
      setStatus(t.stories.comingSoon);
      return;
    }

    silenceHmMedia("story");
    audioRef.current = null;
    videoRef.current?.pause();

    const mp3 = companionAudioPath(story.id, companionId, lang);
    const visuals = [
      ...companionVideoPaths(story.id, companionId, lang),
      ...companionVideoPaths(story.id, companionId, "nl"),
      `/avatars/${companionId}/talk.mp4`,
      `/avatars/${companionId}/welcome.mp4`,
    ];

    const audio = createTrackedAudio("story");
    audio.preload = "auto";
    audio.volume = Math.max(0.45, getVoiceVolume());
    audio.src = mp3;
    audioRef.current = audio;
    candidatesRef.current = visuals;
    candidateIndexRef.current = 0;
    mp3SrcRef.current = mp3;
    visualFallbackRef.current = visuals;
    mp3ModeRef.current = true;
    playingRef.current = true;
    setReading(true);
    setStoryWithAudio(false);
    setActiveVideoSrc(visuals[0] ?? null);
    setStatus(t.stories.reading);

    audio.onended = () => {
      playingRef.current = false;
      setReading(false);
      setStatus(null);
      setActiveVideoSrc(null);
      setStoryWithAudio(false);
    };
    audio.onerror = () => {
      setStatus(t.stories.voiceUnavailable);
      playingRef.current = false;
      setReading(false);
      setActiveVideoSrc(null);
    };
    void audio.play().catch(() => {
      setStatus(t.stories.voiceUnavailable);
      playingRef.current = false;
      setReading(false);
      setActiveVideoSrc(null);
    });
  };

  useEffect(() => {
    if (!reading || !activeVideoSrc) return;
    let cancelled = false;
    let v: HTMLVideoElement | null = null;

    const onError = () => {
      if (cancelled) return;
      const next = candidateIndexRef.current + 1;
      const src = candidatesRef.current[next];
      if (src && playingRef.current) {
        candidateIndexRef.current = next;
        setActiveVideoSrc(src);
      }
    };

    const start = () => {
      if (cancelled) return;
      v = videoRef.current;
      if (!v) {
        requestAnimationFrame(start);
        return;
      }
      v.muted = true;
      v.defaultMuted = true;
      v.volume = 0;
      v.loop = true;
      if (v.getAttribute("src") !== activeVideoSrc) {
        v.src = activeVideoSrc;
      }
      v.addEventListener("error", onError);
      void v.play().catch(onError);
    };

    start();

    return () => {
      cancelled = true;
      v?.removeEventListener("error", onError);
    };
  }, [reading, activeVideoSrc]);

  return (
    <div className="space-y-3 pb-8">
      <section className="hm-card overflow-hidden">
        <div className="space-y-2 px-3 py-3">
          <div
            className="max-h-[min(42vh,22rem)] space-y-1.5 overflow-y-auto rounded-2xl border border-[#e8dfd0] bg-white/70 p-2"
            role="listbox"
            aria-label={t.stories.storyList}
          >
            {STORIES.map((s, index) => {
              const active = storyId === s.id;
              const row = getStoryText(s, lang);
              return (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => selectStory(s.id)}
                  className={`flex w-full items-start gap-2 rounded-xl px-2.5 py-2.5 text-left transition active:scale-[0.99] ${
                    active
                      ? "bg-[#3f6339] text-white shadow-md"
                      : s.playable
                        ? "bg-white/90 text-[#3f6339] hover:bg-white"
                        : "bg-[#f3eee4]/80 text-[#3f6339]/70"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-[#3f6339]/12 text-[#3f6339]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-[family-name:var(--font-display)] text-base font-semibold leading-tight sm:text-lg">
                      {row.title}
                    </span>
                    <span
                      className={`mt-0.5 block text-xs leading-snug sm:text-sm ${
                        active ? "text-white/90" : "text-[#3f6339]/80"
                      }`}
                    >
                      {s.playable ? row.teaser : t.stories.comingSoon}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="hm-card overflow-hidden">
        <div className="border-b border-[#e8dfd0]/55 px-3 py-2 text-center">
          <p className="text-base font-semibold text-[#3f6339]">
            {t.stories.pickCompanion}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-1.5 px-2.5 py-2.5 sm:gap-2 sm:px-3">
          {companions.map((c) => {
            const active = companionId === c.id;
            const crop = c.portraitCrop;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  stopReading();
                  setCompanionId(c.id);
                }}
                aria-pressed={active}
                className={`rounded-xl px-1 py-1.5 transition active:scale-[0.98] sm:rounded-2xl sm:p-2 ${
                  active
                    ? "bg-[#3f6339] text-white shadow-md ring-2 ring-[#cfe0c0]"
                    : "border border-[#e8dfd0] bg-white/75 text-[#3f6339] hover:bg-white"
                }`}
              >
                <div className="relative mx-auto h-12 w-12 overflow-hidden rounded-full bg-[#e8dfd0] ring-2 ring-white/80 shadow-sm sm:h-14 sm:w-14">
                  <Image
                    src={c.portrait}
                    alt=""
                    fill
                    unoptimized
                    className={`object-cover ${crop?.scale ?? ""} ${crop?.position ?? ""}`}
                    sizes="56px"
                  />
                </div>
                <span className="mt-1 block text-center text-xs font-bold sm:text-sm">
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {story && text && companion ? (
        <section className="hm-card mx-auto w-full overflow-hidden">
          <div
            className={`grid grid-cols-1 items-stretch ${
              reading && activeVideoSrc ? "" : "md:grid-cols-2"
            }`}
          >
            <LiveCompanionFace
              companionId={companion.id}
              companionName={companion.name}
              portrait={companion.portrait}
              portraitCrop={companion.portraitCrop ?? null}
              speaking={reading}
              storyVideoSrc={activeVideoSrc}
              storyVideoRef={videoRef}
              storyVideoWithAudio={storyWithAudio}
              expanded={reading && Boolean(activeVideoSrc)}
              compact={!storyWithAudio}
            />

            <div className="flex flex-col justify-center gap-2.5 px-3 py-3">
              <div className="min-w-0">
                <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[#3f6339] sm:text-2xl">
                  {text.title}
                </h3>
                <p className="text-sm font-semibold text-[#3f6339]/85">
                  {companion.name}
                  {!story.playable ? ` · ${t.stories.comingSoon}` : null}
                </p>
                {text.teaser || text.body ? (
                  <p className="mt-1 line-clamp-2 text-sm leading-snug text-[#3f6339]/80">
                    {text.teaser || text.body}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void readAloud()}
                  disabled={reading || !story.playable}
                  className="hm-btn hm-btn-primary inline-flex !min-h-11 items-center gap-2 !px-4 !py-2.5 !text-base font-bold disabled:opacity-50"
                >
                  <SpeakerIcon className="h-5 w-5 shrink-0" />
                  <span>{t.stories.readAloud}</span>
                </button>
                <button
                  type="button"
                  onClick={stopReading}
                  aria-label={t.stories.stop}
                  title={t.stories.stop}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#8b3a2a] text-white transition hover:brightness-110"
                >
                  <StopIcon className="h-4 w-4" />
                </button>
              </div>

              {status ? (
                <p className="text-sm font-semibold text-[#3f6339]">{status}</p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STORIES, type StoryId } from "@/lib/stories";
import { getStoryText } from "@/lib/storyText";
import type { CompanionId } from "@/lib/companions";

/** Only NL is fully cloned right now (overnight XTTS batch) — safe default. */
const KIOSK_LANG = "nl";

const AUDIO_VERSION = "kiosk-1";

function storyAudioSrc(storyId: StoryId, companionId: CompanionId): string {
  return `/stories/${storyId}/${KIOSK_LANG}/${companionId}.mp3?v=${AUDIO_VERSION}`;
}

/**
 * Zero-reading, 3-button touchscreen story player.
 * Big high-contrast hit zones, one dominant play/pause, no body text shown —
 * built for elderly/vulnerable users on an embedded touchscreen.
 */
export function KioskStoryPlayer() {
  const playable = useMemo(() => STORIES.filter((s) => s.playable), []);
  const [storyIndex, setStoryIndex] = useState(0);
  // Companion is fixed to Fenna for now; the automatic fallback/selection logic
  // will be wired in later. Kept as state so that future logic is a drop-in.
  const [companionId] = useState<CompanionId>("fenna");
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clickLockRef = useRef(false);

  const story = playable[storyIndex] ?? playable[0];
  const text = story ? getStoryText(story, KIOSK_LANG) : null;

  // Reload audio whenever story or companion changes; always start paused.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !story) return;
    setIsPlaying(false);
    setLoading(true);
    setHasError(false);
    audio.pause();
    audio.src = storyAudioSrc(story.id, companionId);
    audio.load();
  }, [story, companionId]);

  const handleCanPlay = useCallback(() => setLoading(false), []);
  const handleEnded = useCallback(() => setIsPlaying(false), []);
  const handleError = useCallback(() => {
    setHasError(true);
    setLoading(false);
    setIsPlaying(false);
  }, []);

  /** Guards against double-fire from fast touch taps (mousedown+click). */
  const withClickLock = useCallback((fn: () => void) => {
    if (clickLockRef.current) return;
    clickLockRef.current = true;
    fn();
    window.setTimeout(() => {
      clickLockRef.current = false;
    }, 220);
  }, []);

  const goPrev = useCallback(() => {
    withClickLock(() => {
      setStoryIndex((i) => (i - 1 + playable.length) % playable.length);
    });
  }, [playable.length, withClickLock]);

  const goNext = useCallback(() => {
    withClickLock(() => {
      setStoryIndex((i) => (i + 1) % playable.length);
    });
  }, [playable.length, withClickLock]);

  const togglePlay = useCallback(() => {
    withClickLock(() => {
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        void audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    });
  }, [isPlaying, withClickLock]);

  return (
    <div className="flex h-screen w-screen select-none flex-col bg-[#05381f] text-white">
      <audio
        ref={audioRef}
        onCanPlay={handleCanPlay}
        onEnded={handleEnded}
        onError={handleError}
        preload="auto"
      />

      {/* Story label — minimal text, not the point of this screen */}
      <div className="flex flex-1 items-center justify-center px-6 text-center">
        <p className="font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight sm:text-4xl">
          {text?.title ?? "…"}
        </p>
      </div>

      {/* 3-button zero-reading control bar */}
      <div className="grid grid-cols-3 gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-4 sm:p-6">
        <button
          type="button"
          aria-label="Vorig verhaal"
          onClick={goPrev}
          className="flex aspect-square items-center justify-center rounded-3xl bg-white/12 text-6xl font-black text-white shadow-inner transition active:scale-95 active:bg-white/20"
        >
          ‹
        </button>

        <button
          type="button"
          aria-label={isPlaying ? "Pauzeer" : "Speel af"}
          aria-pressed={isPlaying}
          onClick={togglePlay}
          disabled={loading}
          className={`flex aspect-square items-center justify-center rounded-3xl text-6xl font-black shadow-lg transition active:scale-95 disabled:opacity-60 ${
            isPlaying ? "bg-white text-[#3f6339]" : "bg-[#e0452f] text-white"
          }`}
        >
          {loading ? (
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-current border-t-transparent" />
          ) : hasError ? (
            "⚠️"
          ) : isPlaying ? (
            "❚❚"
          ) : (
            "▶"
          )}
        </button>

        <button
          type="button"
          aria-label="Volgend verhaal"
          onClick={goNext}
          className="flex aspect-square items-center justify-center rounded-3xl bg-white/12 text-6xl font-black text-white shadow-inner transition active:scale-95 active:bg-white/20"
        >
          ›
        </button>
      </div>
    </div>
  );
}

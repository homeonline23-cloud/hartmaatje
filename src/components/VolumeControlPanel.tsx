"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/LanguageProvider";
import {
  getVoiceVolume,
  setVoiceVolume,
  voiceVolumePercent,
  VOICE_VOLUME_EVENT,
} from "@/lib/voiceVolume";

/** Voice-volume slider — compact on settings. */
export function VolumeControlPanel({ compact = false }: { compact?: boolean }) {
  const { lang, t } = useI18n();
  const [volume, setVolume] = useState(() =>
    typeof window !== "undefined" ? getVoiceVolume() : 0.85,
  );

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === "number") setVolume(detail);
      else setVolume(getVoiceVolume());
    };
    window.addEventListener(VOICE_VOLUME_EVENT, onChange);
    return () => window.removeEventListener(VOICE_VOLUME_EVENT, onChange);
  }, []);

  const percent = voiceVolumePercent(volume);
  const quiet = lang === "nl" ? "Zacht" : "Quiet";
  const loud = lang === "nl" ? "Hard" : "Loud";

  if (compact) {
    return (
      <div className="rounded-xl border border-[#e8dfd0] bg-white/70 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-[#3f6339]">{t.settings.volume}</p>
          <p className="text-sm font-bold tabular-nums text-[#3f6339]">
            {percent}%
          </p>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="w-10 shrink-0 text-xs font-semibold text-[#3f6339]">
            {quiet}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={percent}
            aria-label={t.settings.volume}
            onChange={(e) => {
              const next = setVoiceVolume(Number(e.target.value) / 100);
              setVolume(next);
            }}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#e8dfd0] accent-[#3f6339] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3f6339] [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#3f6339]"
          />
          <span className="w-10 shrink-0 text-right text-xs font-semibold text-[#3f6339]">
            {loud}
          </span>
        </div>
      </div>
    );
  }

  const hint =
    lang === "nl"
      ? "Dit regelt hoe hard uw maatje praat."
      : "This controls how loud your companion speaks.";

  return (
    <div className="rounded-2xl border border-[#e8dfd0] bg-white/70 px-4 py-4">
      <p className="text-lg font-semibold text-[#3f6339]">{t.settings.volume}</p>
      <p className="mt-1 text-base text-[#3f6339]">{hint}</p>
      <div className="mt-4 flex items-center gap-3">
        <span className="w-14 shrink-0 text-sm font-semibold text-[#3f6339]">
          {quiet}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={percent}
          aria-label={t.settings.volume}
          onChange={(e) => {
            const next = setVoiceVolume(Number(e.target.value) / 100);
            setVolume(next);
          }}
          className="h-3 w-full cursor-pointer appearance-none rounded-full bg-[#e8dfd0] accent-[#3f6339] [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3f6339] [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#3f6339]"
        />
        <span className="w-14 shrink-0 text-right text-sm font-semibold text-[#3f6339]">
          {loud}
        </span>
      </div>
      <p className="mt-3 text-center text-xl font-bold tabular-nums text-[#3f6339]">
        {percent}%
      </p>
    </div>
  );
}

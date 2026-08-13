"use client";

import Image from "next/image";

export function MicGlyph({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

type MicWindowProps = {
  micLive: boolean;
  userSpeaking: boolean;
  micLevel: number;
  phase: string;
  statusLabel: string;
  starting?: boolean;
  startLabel: string;
  stopLabel: string;
  onStart: () => void;
  onStop: () => void;
  /** Tighter layout for Bioscoop Kamer */
  compact?: boolean;
  /** Vertical column: portrait top, mic bottom (cinema left rail) */
  cinemaSidebar?: boolean;
  companionName?: string;
  companionPortrait?: string;
  companionPortraitCrop?: { scale: string; position: string } | null;
  /** Lip-synced talking video (muted loop while AI speaks) */
  avatarVideoUrl?: string | null;
};

/**
 * One press starts mic. Mic stays ON until resident presses stop.
 */
export function MicWindow({
  micLive,
  userSpeaking,
  micLevel,
  phase,
  statusLabel,
  starting = false,
  startLabel,
  stopLabel,
  onStart,
  onStop,
  compact = false,
  cinemaSidebar = false,
  companionName,
  companionPortrait,
  companionPortraitCrop = null,
  avatarVideoUrl = null,
}: MicWindowProps) {
  const barPct = Math.min(
    100,
    Math.round(Math.max(micLevel, userSpeaking ? 8 : 0) * 5)
  );
  const aiSpeaking = phase === "speaking";
  const showTalkingVideo = Boolean(avatarVideoUrl && aiSpeaking);

  const portrait = companionPortrait ? (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`relative overflow-hidden rounded-full bg-[#e8dfd0] shadow-md transition ring-2 ${
          aiSpeaking
            ? "ring-[#3f6339] ring-offset-2 ring-offset-[#f7f1e6]"
            : "ring-white"
        } ${
          cinemaSidebar
            ? "h-14 w-14 sm:h-16 sm:w-16"
            : compact
              ? "h-24 w-24 sm:h-28 sm:w-28"
              : "h-28 w-28 sm:h-32 sm:w-32"
        }`}
      >
        {showTalkingVideo ? (
          <video
            key={avatarVideoUrl!}
            src={avatarVideoUrl!}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            aria-label={companionName ?? ""}
          />
        ) : (
          <Image
            src={companionPortrait}
            alt={companionName ?? ""}
            fill
            unoptimized
            className={`object-cover ${
              companionPortraitCrop
                ? `${companionPortraitCrop.scale} ${companionPortraitCrop.position}`
                : ""
            }`}
            sizes="128px"
          />
        )}
      </div>
      <p
        className={`text-center font-bold leading-tight ${
          cinemaSidebar
            ? "text-sm text-white sm:text-base"
            : "text-sm text-[#3f6339] sm:text-base"
        }`}
      >
        {companionName}
      </p>
    </div>
  ) : null;

  if (cinemaSidebar) {
    const micOff = (
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          aria-label={startLabel}
          disabled={starting}
          onClick={onStart}
          className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white hm-dark shadow-md transition hover:brightness-110 active:scale-[0.97] disabled:opacity-60 sm:h-16 sm:w-16"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white sm:h-9 sm:w-9">
            <MicGlyph className="h-4 w-4 text-[#3f6339] sm:h-5 sm:w-5" />
          </span>
        </button>
        <p className="text-xs font-bold text-white sm:text-sm">Aan</p>
      </div>
    );

    const micOn = (
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-full rounded-xl border border-white/40 hm-dark px-1.5 py-1.5 text-center text-white">
          <p className="text-[10px] font-bold uppercase tracking-wide sm:text-xs">
            Aan
          </p>
          <p className="mt-0.5 max-w-[4.5rem] truncate text-[10px] leading-tight opacity-95 sm:text-xs">
            {phase === "thinking"
              ? "Denken..."
              : phase === "speaking"
                ? "Praat..."
                : userSpeaking
                  ? "Ik hoor u"
                  : statusLabel}
          </p>
          <div className="mx-auto mt-1 h-1.5 w-12 overflow-hidden rounded-full bg-white/25">
            <div
              className={`h-full rounded-full transition-[width] duration-75 ${
                userSpeaking ? "bg-[#ffd2a6]" : "bg-white"
              }`}
              style={{ width: `${barPct}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8b3a2a] text-xs font-bold text-white shadow-md transition hover:brightness-110 sm:h-14 sm:w-14 sm:text-sm"
          onClick={onStop}
        >
          Uit
        </button>
      </div>
    );

    return (
      <div className="flex h-full min-h-[14rem] flex-col items-center justify-between py-1">
        {portrait}
        {micLive ? micOn : micOff}
      </div>
    );
  }

  if (!micLive) {
    if (compact) {
      return (
        <div className="mx-auto flex w-full max-w-lg items-center justify-center gap-3">
          {portrait}
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              aria-label={startLabel}
              disabled={starting}
              onClick={onStart}
              className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-[var(--hm-dark)] hm-dark shadow-md transition hover:brightness-110 active:scale-[0.97] disabled:opacity-60 sm:h-14 sm:w-14"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-white sm:h-8 sm:w-8">
                <MicGlyph className="h-4 w-4 text-[#3f6339] sm:h-5 sm:w-5" />
              </span>
            </button>
            <p className="text-sm font-bold text-[#3f6339] sm:text-base">Aan</p>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3">
        <p className="text-center text-base text-[#3f6339]">{statusLabel}</p>
        <button
          type="button"
          aria-label={startLabel}
          disabled={starting}
          onClick={onStart}
          className="flex h-20 w-20 items-center justify-center rounded-full border-[5px] border-[var(--hm-dark)] hm-dark shadow-md transition hover:brightness-110 active:scale-[0.97] disabled:opacity-60 sm:h-24 sm:w-24"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-white sm:h-14 sm:w-14">
            <MicGlyph className="h-6 w-6 text-[#3f6339] sm:h-7 sm:w-7" />
          </span>
        </button>
      </div>
    );
  }

  if (compact) {
    const compactStatus =
      phase === "thinking"
        ? "Even denken..."
        : phase === "speaking"
          ? "Maatje praat..."
          : userSpeaking
            ? "Ik hoor u..."
            : "Ik luister...";
    return (
      <div className="flex max-w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden sm:gap-2">
        {portrait}
        <div className="min-w-0 max-w-[6.5rem] rounded-xl border-2 border-[var(--hm-dark)] hm-dark px-1.5 py-1 text-center text-white sm:max-w-[7.5rem] sm:px-2 sm:py-1.5">
          <p className="text-sm font-bold tracking-wide">Aan</p>
          <p className="truncate text-[11px] leading-tight opacity-95 sm:text-xs">
            {compactStatus}
          </p>
          <div className="mx-auto mt-1 h-1.5 w-12 overflow-hidden rounded-full bg-white/25 sm:w-14">
            <div
              className={`h-full rounded-full transition-[width] duration-75 ${
                userSpeaking ? "bg-[#ffd2a6]" : "bg-white"
              }`}
              style={{ width: `${barPct}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          aria-label={stopLabel}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8b3a2a] text-sm font-bold text-white shadow-md transition hover:brightness-110 sm:h-12 sm:w-12"
          onClick={onStop}
        >
          Uit
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4">
      <div className="w-full rounded-2xl border-2 border-[var(--hm-dark)] hm-dark px-4 py-4 text-center text-white shadow-md">
        <p className="text-xl font-bold tracking-wide">MICROFOON AAN</p>
        <p className="mt-1 text-base opacity-95">
          {phase === "thinking"
            ? "Even denken..."
            : phase === "speaking"
              ? "Maatje praat..."
              : userSpeaking
                ? "Ik hoor u..."
                : "Praat gerust - niet opnieuw drukken"}
        </p>
        <div className="mx-auto mt-3 h-3 max-w-xs overflow-hidden rounded-full bg-white/25">
          <div
            className={`h-full rounded-full transition-[width] duration-75 ${
              userSpeaking ? "bg-[#ffd2a6]" : "bg-white"
            }`}
            style={{ width: `${barPct}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        className="rounded-full bg-[#8b3a2a] px-8 py-4 text-xl font-bold text-white transition hover:brightness-110 sm:text-2xl"
        onClick={onStop}
      >
        {stopLabel}
      </button>
    </div>
  );
}

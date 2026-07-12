"use client";

import { useEffect, useRef } from "react";
import { AvatarPortrait } from "@/components/AvatarPortrait";
import { companionMediaBackdropClass, companionShellClass } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { getWelcomeVideoCrop, getWelcomeVideoUrl } from "@/lib/avatars";
import type { NatureScene } from "@/lib/natureShowcase";
import { getVoiceIdentity } from "@/lib/voice/registry";
import type { VoiceIdentityId } from "@/lib/voice/types";

export type CompanionPhase = "idle" | "welcoming" | "present";

type CompanionPanelProps = {
  identityId: VoiceIdentityId;
  phase: "welcoming" | "present";
  playNonce: number;
  natureScene?: NatureScene | null;
  onWelcomeComplete: () => void;
  onClose: () => void;
  onBackFromNature?: () => void;
};

/** Gekozen maatje blijft open op het scherm — welkomstvideo, daarna portret. */
export function CompanionPanel({
  identityId,
  phase,
  playNonce,
  natureScene,
  onWelcomeComplete,
  onClose,
  onBackFromNature,
}: CompanionPanelProps) {
  const { copy, app } = useLanguage();
  const character = getVoiceIdentity(identityId);
  const videoSrc = getWelcomeVideoUrl(identityId);
  const videoCrop = getWelcomeVideoCrop(identityId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const showVideo = phase === "welcoming" && Boolean(videoSrc) && !natureScene;
  const showNature = Boolean(natureScene);

  useEffect(() => {
    if (!showVideo || !videoRef.current) return;
    void videoRef.current.play().catch(() => {});
  }, [showVideo, identityId, playNonce]);

  const handleClose = () => {
    videoRef.current?.pause();
    onClose();
  };

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-[#4a6741]/50 bg-gradient-to-b from-[#fffdf9] to-[#f5f0e8] shadow-[0_12px_28px_rgba(44,36,22,0.15)]">
      <div className="flex items-center justify-between gap-2 border-b border-[#e8dfd0]/60 px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`hm-pulse-dot h-3 w-3 shrink-0 rounded-full ${
              showVideo ? "bg-[#c45c3e]" : "bg-[#4a6741]"
            }`}
            aria-hidden="true"
          />
          <p className="text-lg font-bold leading-snug text-[#2c4a22] sm:text-xl">
            {showNature
              ? app.chat.natureShowTitle(character.displayName)
              : showVideo
                ? `${character.displayName} — ${copy.liveWelcomeHint}`
                : copy.liveAvatarListening(character.displayName)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showNature ? (
            <button
              type="button"
              onClick={onBackFromNature}
              className="rounded-xl border border-[#4a6741]/40 bg-[#eef5ea] px-3 py-2 text-base font-semibold text-[#2c4a22] hover:bg-[#e3eddf] sm:px-4 sm:text-lg"
            >
              {app.chat.natureBackTo(character.displayName)}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleClose}
            aria-label={app.chat.companionStopAria(character.displayName)}
            className="rounded-xl border border-[#d8ccb8] bg-white px-3 py-2 text-base font-semibold text-[#4a6741] hover:bg-[#f5f0e8] sm:px-4 sm:text-lg"
          >
            {app.chat.companionStop}
          </button>
        </div>
      </div>

      <div className={`overflow-hidden ${companionShellClass}`}>
        {showNature ? (
          <div className={`relative aspect-video w-full ${companionMediaBackdropClass}`}>
            {natureScene!.kind === "live" ? (
              <iframe
                title={natureScene!.alt}
                src={natureScene!.embedUrl}
                className="h-full w-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={natureScene!.url}
                alt={natureScene!.alt}
                className="h-full w-full object-cover"
              />
            )}
            {natureScene!.credit ? (
              <p className="absolute bottom-0 left-0 right-0 bg-black/50 px-3 py-1.5 text-center text-sm text-white/90">
                {natureScene!.kind === "live"
                  ? `${app.chat.natureLiveBadge} · ${natureScene!.credit}`
                  : natureScene!.credit}
              </p>
            ) : null}
          </div>
        ) : showVideo ? (
          <video
            ref={videoRef}
            key={`${identityId}-${playNonce}`}
            src={videoSrc!}
            className={`aspect-video w-full object-cover ${
              videoCrop ? `${videoCrop.scale} ${videoCrop.position}` : ""
            }`}
            playsInline
            autoPlay
            onEnded={onWelcomeComplete}
          />
        ) : (
          <div className={`flex aspect-video w-full items-center justify-center ${companionMediaBackdropClass}`}>
            <AvatarPortrait
              identityId={identityId}
              displayName={character.displayName}
              size="xl"
              className="border-4 border-white shadow-lg"
            />
          </div>
        )}
      </div>

      <p className="px-4 py-2.5 text-center text-lg font-semibold text-[#2c4a22] sm:text-xl">
        {showNature ? natureScene!.alt : character.displayName}
      </p>
    </div>
  );
}

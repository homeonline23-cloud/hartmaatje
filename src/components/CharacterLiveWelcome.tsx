"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AvatarPortrait } from "@/components/AvatarPortrait";
import { useLanguage } from "@/context/LanguageContext";
import { getWelcomeVideoUrl, getWelcomeVideoCrop } from "@/lib/avatars";
import { getVoiceIdentity } from "@/lib/voice/registry";
import { stopHartMaatjeSpeech } from "@/lib/voice";
import type { VoiceIdentityId } from "@/lib/voice/types";

type CharacterLiveWelcomeProps = {
  identityId: VoiceIdentityId;
  open: boolean;
  playNonce: number;
  onClose: () => void;
  onWelcomeComplete: () => void;
};

export function CharacterLiveWelcome({
  identityId,
  open,
  playNonce,
  onClose,
  onWelcomeComplete,
}: CharacterLiveWelcomeProps) {
  const { copy, app } = useLanguage();
  const character = getVoiceIdentity(identityId);
  const videoSrc = getWelcomeVideoUrl(identityId);
  const videoCrop = getWelcomeVideoCrop(identityId);
  const [welcomeFinished, setWelcomeFinished] = useState(false);

  useEffect(() => {
    setWelcomeFinished(false);
  }, [identityId, playNonce, open]);

  const finishWelcome = useCallback(() => {
    setWelcomeFinished(true);
    onWelcomeComplete();
  }, [onWelcomeComplete]);

  const close = useCallback(() => {
    stopHartMaatjeSpeech();
    if (!welcomeFinished) onWelcomeComplete();
    onClose();
  }, [onClose, onWelcomeComplete, welcomeFinished]);

  if (!open || !videoSrc || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2c2416]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${character.displayName} — live`}
    >
      <div className="hm-character-enter w-full max-w-xl overflow-hidden rounded-3xl border border-[#e8dfd0]/80 bg-gradient-to-b from-[#fffdf9] to-[#f5f0e8] shadow-[0_24px_56px_rgba(44,36,22,0.4)]">
        <div className="flex items-center justify-between border-b border-[#e8dfd0]/60 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-3 w-3 shrink-0 rounded-full ${
                welcomeFinished ? "hm-pulse-dot bg-[#4a6741]" : "hm-pulse-dot bg-[#c45c3e]"
              }`}
              aria-hidden="true"
            />
            <span className="text-lg font-bold text-[#2c4a22] sm:text-xl">
              {welcomeFinished
                ? copy.liveAvatarListening(character.displayName)
                : app.chat.liveWelcomeLiveTitle(character.displayName)}
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-[#d8ccb8] bg-white px-4 py-2 text-lg font-semibold text-[#4a6741] hover:bg-[#f5f0e8] sm:text-xl"
          >
            {copy.liveWelcomeContinue}
          </button>
        </div>

        <div className="overflow-hidden bg-[#2c2416]">
          {welcomeFinished ? (
            <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-b from-[#3d4a3a] to-[#2c2416]">
              <AvatarPortrait
                identityId={identityId}
                displayName={character.displayName}
                size="xl"
                className="border-4 border-white shadow-lg"
              />
            </div>
          ) : (
            <video
              key={`${identityId}-${playNonce}`}
              src={videoSrc}
              className={`aspect-video w-full object-cover ${
                videoCrop ? `${videoCrop.scale} ${videoCrop.position}` : ""
              }`}
              playsInline
              autoPlay
              onEnded={finishWelcome}
            />
          )}
        </div>

        <p className="px-4 py-3 text-center text-lg text-[#5c4a32] sm:text-xl">
          {welcomeFinished
            ? copy.liveAvatarListening(character.displayName)
            : `${character.displayName} — ${copy.liveWelcomeHint}`}
        </p>
      </div>
    </div>,
    document.body,
  );
}

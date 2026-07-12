"use client";

import { AvatarPortrait } from "@/components/AvatarPortrait";
import { hartmaatjePortraitRingClass } from "@/lib/hartmaatjeTheme";
import { getVoiceIdentity } from "@/lib/voice/registry";
import type { VoiceIdentityId } from "@/lib/voice/types";
import { LiveAvatarCharacter } from "@/components/liveavatar/LiveAvatarCharacter";
import {
  isLiveAvatarEnabledFor,
  useLiveAvatarConfig,
} from "@/lib/liveavatar/useLiveAvatarConfig";

type CharacterPresenceProps = {
  identityId: VoiceIdentityId;
  /** Verandert bij elke stemkeuze — speelt zachte verschijn-animatie opnieuw af. */
  animateKey: number;
  chooseVoiceLabel: string;
  onLiveSessionActiveChange?: (active: boolean) => void;
};

const RING_CLASS = hartmaatjePortraitRingClass;

export function CharacterPresence({
  identityId,
  animateKey,
  chooseVoiceLabel,
  onLiveSessionActiveChange,
}: CharacterPresenceProps) {
  const liveAvatarConfig = useLiveAvatarConfig();
  const useLiveAvatar = isLiveAvatarEnabledFor(liveAvatarConfig, identityId);

  if (useLiveAvatar) {
    return (
      <LiveAvatarCharacter
        identityId={identityId}
        animateKey={animateKey}
        onSessionActiveChange={onLiveSessionActiveChange}
      />
    );
  }

  const character = getVoiceIdentity(identityId);

  return (
    <div
      key={animateKey}
      className="hm-character-enter mx-auto mb-4 max-w-md px-2"
      role="status"
      aria-live="polite"
      aria-label={chooseVoiceLabel}
    >
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-[#e8dfd0]/70 bg-gradient-to-b from-[#fffdf9] to-[#f5f0e8]/95 px-5 py-5 shadow-[0_12px_28px_rgba(44,36,22,0.1)]">
        <p className="text-2xl font-extrabold text-[#2c4a22] sm:text-[1.9rem]">
          {chooseVoiceLabel}
        </p>
        <div
          className={`flex h-24 w-24 items-center justify-center rounded-full border-[4px] border-white shadow-[0_10px_24px_rgba(44,36,22,0.18)] sm:h-28 sm:w-28 ${RING_CLASS}`}
        >
          <AvatarPortrait
            identityId={identityId}
            displayName={character.displayName}
            size="md"
            className="border-[3px]"
          />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-2xl font-bold text-[#2c4a22] sm:text-[1.75rem]">
            {character.displayName}
          </p>
          <p className="text-base leading-relaxed text-[#5c4a32] sm:text-lg">
            {character.uiDescription}
          </p>
        </div>
      </div>
    </div>
  );
}

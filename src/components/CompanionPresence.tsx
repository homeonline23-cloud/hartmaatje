"use client";

import { AvatarPortrait } from "@/components/AvatarPortrait";
import { useLanguage } from "@/context/LanguageContext";
import { getVoiceIdentity } from "@/lib/voice/registry";
import type { VoiceIdentityId } from "@/lib/voice/types";

type CompanionPresenceProps = {
  identityId: VoiceIdentityId;
  compact?: boolean;
};

/** Gekozen maatje blijft zichtbaar — stand-in tot live avatar er is. */
export function CompanionPresence({
  identityId,
  compact = false,
}: CompanionPresenceProps) {
  const { copy } = useLanguage();
  const character = getVoiceIdentity(identityId);

  if (compact) {
    return (
      <div className="flex items-center justify-center gap-3">
        <div className="overflow-hidden rounded-full border-[3px] border-[#4a6741] shadow-md">
          <AvatarPortrait
            identityId={identityId}
            displayName={character.displayName}
            size="md"
            className="border-0"
          />
        </div>
        <div className="text-left">
          <p className="text-xl font-bold text-[#2c4a22] sm:text-2xl">
            {character.displayName}
          </p>
          <p className="text-base text-[#5c4a32] sm:text-lg">
            {copy.liveAvatarListening(character.displayName)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="overflow-hidden rounded-3xl border-4 border-[#4a6741] bg-[#2c2416] shadow-[0_12px_28px_rgba(44,36,22,0.2)]">
        <AvatarPortrait
          identityId={identityId}
          displayName={character.displayName}
          size="xl"
          className="rounded-none border-0"
        />
      </div>
      <p className="text-2xl font-bold text-[#2c4a22] sm:text-[1.75rem]">
        {character.displayName}
      </p>
      <p className="max-w-md text-lg text-[#5c4a32] sm:text-xl">
        {copy.liveAvatarListening(character.displayName)}
      </p>
    </div>
  );
}

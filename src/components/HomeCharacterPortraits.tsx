"use client";

import { AvatarPortrait } from "@/components/AvatarPortrait";
import { useLanguage } from "@/context/LanguageContext";
import { HOME_PORTRAIT_IDENTITIES } from "@/lib/avatars";
import { hartmaatjePortraitRingClass } from "@/lib/hartmaatjeTheme";
import { getVoiceIdentity } from "@/lib/voice/registry";
import type { VoiceIdentityId } from "@/lib/voice/types";

const PORTRAIT_RING_CLASS = hartmaatjePortraitRingClass;

type HomeCharacterPortraitsProps = {
  selectedId?: VoiceIdentityId | null;
  onPick?: (id: VoiceIdentityId) => void;
  disabled?: boolean;
  className?: string;
};

export function HomeCharacterPortraits({
  selectedId,
  onPick,
  disabled = false,
  className = "",
}: HomeCharacterPortraitsProps) {
  const { app } = useLanguage();

  return (
    <div
      className={`flex flex-wrap items-start justify-center gap-4 sm:gap-5 ${className}`}
      role="list"
      aria-label={app.chat.chooseVoiceAria}
    >
      {HOME_PORTRAIT_IDENTITIES.map((id) => {
        const name = getVoiceIdentity(id).displayName;
        const selected = selectedId === id;
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onPick?.(id)}
            aria-label={app.chat.chooseVoiceNamed(name)}
            aria-pressed={selected}
            className={`relative z-20 flex min-h-[7.5rem] min-w-[6.5rem] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[7rem] ${
              selected
                ? "border-[#2c4a22] bg-white/95 shadow-md"
                : "border-[#e8dfd0] bg-white/80 hover:bg-white hover:shadow-md"
            }`}
          >
            <div
              className={`overflow-hidden rounded-full border-[3px] ${PORTRAIT_RING_CLASS} shadow-[0_6px_16px_rgba(44,36,22,0.14)] ${
                selected ? "border-[#2c4a22] ring-2 ring-[#4a6741]/30" : "border-white"
              }`}
            >
              <AvatarPortrait
                identityId={id}
                displayName={name}
                size="lg"
                className="border-0"
              />
            </div>
            <p
              className={`text-lg font-bold leading-none ${
                selected ? "text-[#2c4a22]" : "text-[#5c4a32]"
              }`}
            >
              {name}
            </p>
          </button>
        );
      })}
    </div>
  );
}

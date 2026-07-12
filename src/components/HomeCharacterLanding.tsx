"use client";

import { useEffect, useState } from "react";
import { CompanionVoiceSession } from "@/components/CompanionVoiceSession";
import { HomeCharacterPortraits } from "@/components/HomeCharacterPortraits";
import { useHomeCompanion } from "@/context/HomeCompanionContext";
import { useLanguage } from "@/context/LanguageContext";
import type { VoiceIdentityId } from "@/lib/voice/types";

export function HomeCharacterLanding() {
  const { copy, lang } = useLanguage();
  const { sessionKey } = useHomeCompanion();
  const [picked, setPicked] = useState<VoiceIdentityId | null>(null);

  useEffect(() => {
    setPicked(null);
  }, [sessionKey]);

  if (picked) {
    return (
      <CompanionVoiceSession
        key={`${picked}-${sessionKey}`}
        identityId={picked}
        onBack={() => setPicked(null)}
      />
    );
  }

  return (
    <div className="relative z-10 flex flex-col overflow-hidden rounded-3xl border border-[#f8f2e8]/70 bg-[#faf6f0]/95 shadow-[0_12px_32px_rgba(44,36,22,0.18)] backdrop-blur-md">
      <div className="border-b border-[#e8dfd0]/55 px-4 py-4 text-center text-2xl font-semibold text-[#4a6741]">
        {copy.chooseVoice}
      </div>

      <div className="space-y-5 px-4 py-5">
        <p className="text-center text-xl font-semibold text-[#4a6741]">
          {lang === "en"
            ? "Tap a portrait to start your conversation."
            : "Tik op een portret om uw gesprek te beginnen."}
        </p>

        <HomeCharacterPortraits onPick={(id) => setPicked(id)} />

        <div className="space-y-2 text-center">
          <p className="text-xl font-semibold leading-snug text-[#4a6741]">
            {copy.greetingDefault}
          </p>
          <p className="text-lg font-medium leading-snug text-[#5c4a32]">
            {copy.welcomeLine2}
          </p>
        </div>
      </div>
    </div>
  );
}

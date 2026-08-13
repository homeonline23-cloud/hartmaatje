"use client";

import { FrontDeskButton } from "@/components/FrontDeskButton";
import { HartMaatjeHeader } from "@/components/HartMaatjeHeader";
import { HomeCharacterLanding } from "@/components/HomeCharacterLanding";
import { InnerPageBackground } from "@/components/InnerPageBackground";
import { LanguageProvider as RoomI18nProvider } from "@/i18n/LanguageProvider";

/** Same portraits + welcome video as home, in the real HartMaatje chrome. */
export default function MaatjesPage() {
  return (
    <RoomI18nProvider>
      <div className="relative min-h-screen overflow-x-hidden">
        <InnerPageBackground />
        <HartMaatjeHeader />
        <main className="relative z-10 mx-auto w-full max-w-3xl px-4 py-2 pb-28">
          <HomeCharacterLanding />
        </main>
        <FrontDeskButton />
      </div>
    </RoomI18nProvider>
  );
}

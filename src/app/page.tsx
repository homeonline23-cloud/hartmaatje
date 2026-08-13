"use client";

import { useEffect, useState } from "react";
import { FrontDeskButton } from "@/components/FrontDeskButton";
import { HomeBookCover } from "@/components/HomeBookCover";
import { HomeCharacterLanding } from "@/components/HomeCharacterLanding";
import { HartMaatjeHeader } from "@/components/HartMaatjeHeader";
import { InnerPageBackground } from "@/components/InnerPageBackground";
import { useHomeCompanion } from "@/context/HomeCompanionContext";
import { LanguageProvider as RoomI18nProvider } from "@/i18n/LanguageProvider";

export default function Home() {
  const { sessionKey } = useHomeCompanion();
  const [bookOpen, setBookOpen] = useState(false);

  useEffect(() => {
    setBookOpen(false);
  }, [sessionKey]);

  return (
    <RoomI18nProvider>
      {!bookOpen ? (
        <HomeBookCover onOpen={() => setBookOpen(true)} />
      ) : (
        <div className="relative min-h-screen overflow-x-hidden">
          <InnerPageBackground />
          <HartMaatjeHeader />
          <main className="relative z-10 mx-auto w-full max-w-3xl px-4 py-2 pb-28">
            <HomeCharacterLanding />
          </main>
          <FrontDeskButton />
        </div>
      )}
    </RoomI18nProvider>
  );
}

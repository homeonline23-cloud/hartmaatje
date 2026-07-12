"use client";

import { useEffect, useState } from "react";
import { Emergency112Button } from "@/components/Emergency112Button";
import { HomeBookCover } from "@/components/HomeBookCover";
import { HomeCharacterLanding } from "@/components/HomeCharacterLanding";
import { HartMaatjeHeader } from "@/components/HartMaatjeHeader";
import { InnerPageBackground } from "@/components/InnerPageBackground";
import { useHomeCompanion } from "@/context/HomeCompanionContext";

export default function Home() {
  const { sessionKey } = useHomeCompanion();
  const [bookOpen, setBookOpen] = useState(false);

  useEffect(() => {
    setBookOpen(false);
  }, [sessionKey]);

  if (!bookOpen) {
    return <HomeBookCover onOpen={() => setBookOpen(true)} />;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <InnerPageBackground />
      <HartMaatjeHeader />
      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 py-2 pb-28">
        <HomeCharacterLanding />
      </main>
      <Emergency112Button />
    </div>
  );
}

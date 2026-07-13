"use client";

import Image from "next/image";
import { Cormorant_Garamond } from "next/font/google";
import { HartmaatjeBrandTitle } from "@/components/HartmaatjeBrandTitle";
import { LogoRainbowHalo } from "@/components/LogoRainbowHalo";
import { HartmaatjeDigitalClock } from "@/components/HartmaatjeDigitalClock";
import { companionStartButtonClass } from "@/components/ui";
import { hartmaatjeGreenOverlayClass } from "@/lib/hartmaatjeTheme";
import { useLanguage } from "@/context/LanguageContext";

const coverFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["italic", "normal"],
});

type HomeBookCoverProps = {
  onOpen: () => void;
};

/** Boekkaft — alleen hier de cover-afbeelding; andere pagina's blijven effen groen. */
export function HomeBookCover({ onOpen }: HomeBookCoverProps) {
  const { copy } = useLanguage();

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <Image
        src="/hartmaatje-cover.png"
        alt="HartMaatje — regenboog aan zee"
        fill
        priority
        unoptimized
        className="object-cover object-center"
        sizes="100vw"
      />

      <div
        className={`pointer-events-none absolute inset-0 ${hartmaatjeGreenOverlayClass}`}
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[42vh] bg-gradient-to-t from-[#0a2a18]/88 via-[#0a2a18]/35 to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-screen w-full flex-col px-6 pb-14">
        <div className="pointer-events-none flex justify-center pt-[11%] sm:pt-[12%]">
          <div className="relative flex flex-col items-center">
            <LogoRainbowHalo />
            <Image
              src="/hartmaatje-logo.png"
              alt="HartMaatje logo"
              width={136}
              height={136}
              unoptimized
              className="relative z-10 h-[8.5rem] w-[8.5rem] object-contain drop-shadow-[0_4px_22px_rgba(0,0,0,0.5),0_0_30px_rgba(255,255,255,0.28)] sm:h-36 sm:w-36"
              priority
            />
            <HartmaatjeBrandTitle variant="cover" className="relative z-10 mt-1" />
          </div>
        </div>

        <div className="min-h-[4.5rem] flex-1" aria-hidden="true" />

        <div className="flex w-full flex-col items-center">
          <p
            className={`${coverFont.className} mb-12 max-w-xl text-center text-[1.65rem] font-normal italic leading-[1.5] tracking-[0.04em] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.7)] sm:text-[2rem] sm:leading-[1.45]`}
          >
            {copy.welcomeLine1}
            <br />
            {copy.coverTaglineLine2}
          </p>

          <button
            type="button"
            onClick={onOpen}
            className={`w-full max-w-md min-h-[4rem] px-8 py-4 text-2xl font-bold ${companionStartButtonClass}`}
          >
            {copy.coverStartChat}
          </button>

          <div className="pointer-events-none mt-6 w-full max-w-md">
            <HartmaatjeDigitalClock variant="footer" />
          </div>
        </div>
      </div>
    </div>
  );
}

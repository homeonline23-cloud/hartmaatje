"use client";

import Image from "next/image";
import { Cormorant_Garamond } from "next/font/google";
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
  const tagline =
    copy.welcomeLine1 === "U bent niet alleen."
      ? (
          <>
            U bent niet
            <br />
            alleen.
          </>
        )
      : (
          <>
            You are not
            <br />
            alone.
          </>
        );

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <Image
        src="/hartmaatje-cover.png"
        alt="HartMaatje — regenboog aan zee"
        fill
        priority
        unoptimized
        className="object-cover object-[center_38%] sm:object-[center_42%]"
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

      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-end px-6 pb-14 pt-24">
        <p
          className={`${coverFont.className} mb-12 text-center text-[2rem] font-medium italic leading-snug tracking-[0.04em] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.7)] sm:text-[2.35rem]`}
        >
          {tagline}
        </p>

        <button
          type="button"
          onClick={onOpen}
          className={`w-full max-w-md min-h-[4rem] px-8 py-4 text-2xl font-bold ${companionStartButtonClass}`}
        >
          {copy.coverStartChat}
        </button>
      </div>
    </div>
  );
}

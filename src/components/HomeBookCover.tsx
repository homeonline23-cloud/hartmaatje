"use client";

import Image from "next/image";
import { Cormorant_Garamond } from "next/font/google";
import { DigitalClock } from "@/components/DigitalClock";
import { FrontpageIntroPlayer } from "@/components/FrontpageIntroPlayer";
import { HartmaatjeBrandTitle } from "@/components/HartmaatjeBrandTitle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/LanguageProvider";

const coverFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["italic", "normal"],
});

const startBtnClass =
  "rounded-2xl hm-dark font-bold shadow-[0_8px_22px_rgba(5,56,31,0.42)] transition hover:brightness-[1.08] active:scale-[0.98]";

const coverCtlH = "!min-h-[3.25rem] !py-2.5";

type HomeBookCoverProps = {
  onOpen: () => void;
};

/**
 * Frontpage — same hm-shell column + brand mark size as every other page.
 */
export function HomeBookCover({ onOpen }: HomeBookCoverProps) {
  const { t } = useI18n();

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <Image
        src="/hartmaatje-cover.png"
        alt={t.cover.coverAlt}
        fill
        priority
        unoptimized
        className="object-cover object-center"
        sizes="100vw"
      />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05381F]/22 via-transparent to-[#1B493C]/38"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[42vh] bg-gradient-to-t from-[#0a2a18]/88 via-[#0a2a18]/35 to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-screen w-full flex-col pb-20 pt-4 sm:pt-6">
        <div className="hm-shell flex flex-col items-center">
          <div className="relative flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <Image
                src="/hartmaatje-logo.png"
                alt="HartMaatje logo"
                width={120}
                height={120}
                unoptimized
                className="hm-brand-logo relative z-10 drop-shadow-[0_4px_18px_rgba(0,0,0,0.5),0_0_24px_rgba(255,255,255,0.22)]"
                priority
              />
            </div>
            <HartmaatjeBrandTitle variant="header" className="relative z-10 mt-1" />
            <p className="relative z-10 mt-1 text-center text-base font-medium text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)] sm:text-lg">
              {t.brand.tagline}
            </p>
          </div>

          <div className="relative z-20 mt-5 w-full sm:mt-6">
            <FrontpageIntroPlayer />
          </div>

          <div className="relative z-20 mx-auto mt-4 flex w-full max-w-md flex-col items-center gap-1.5 sm:mt-5">
            <button
              type="button"
              onClick={onOpen}
              className={`inline-flex w-full items-center justify-center gap-3 ${coverCtlH} px-8 text-lg sm:text-xl ${startBtnClass}`}
            >
              <span className="hm-arrow-right text-2xl sm:text-3xl" aria-hidden="true">
                &rarr;
              </span>
              <span>{t.cover.startChat}</span>
              <span className="hm-arrow-left text-2xl sm:text-3xl" aria-hidden="true">
                &larr;
              </span>
            </button>

            <p
              className={`${coverFont.className} mt-2 w-full text-center text-[1.15rem] font-normal italic leading-[1.4] tracking-[0.03em] text-white/88 drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)] sm:text-[1.3rem] sm:leading-[1.35]`}
            >
              {t.cover.welcomeLine1}
              <br />
              {t.cover.welcomeLine2}
            </p>

            <div className="mt-1 grid w-full grid-cols-2 gap-1.5">
              <LanguageSwitcher asNavButton size="cover" />
              <DigitalClock asWindow size="cover" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

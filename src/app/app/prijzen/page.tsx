"use client";

import Link from "next/link";
import { AppPagePanel } from "@/components/AppPagePanel";
import { companionStartButtonClass } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { hartmaatjeGreenSurfaceClass } from "@/lib/hartmaatjeTheme";
import {
  formatMonthlyPriceDisplay,
  HARTMAATJE_MONTHLY_PRICE_EUR,
} from "@/lib/pricing/hartmaatjePricing";

export default function PrijzenPage() {
  const { app, lang } = useLanguage();
  const copy = app.pricing;
  const priceDisplay = formatMonthlyPriceDisplay(HARTMAATJE_MONTHLY_PRICE_EUR, lang);

  return (
    <AppPagePanel title={copy.pageTitle} centerTitle>
      <section className="space-y-4">
        <p className="text-2xl font-semibold leading-snug text-[#2c4a22] sm:text-3xl">
          {copy.headline}
        </p>
        <p className="text-xl leading-relaxed text-[#5c4a32]">{copy.subline}</p>
      </section>

      <section
        className={`rounded-3xl px-6 py-8 text-center text-white shadow-lg ${hartmaatjeGreenSurfaceClass}`}
        aria-label={copy.cardTitle}
      >
        <p className="text-xl font-semibold text-white/90 sm:text-2xl">{copy.cardTitle}</p>
        {priceDisplay ? (
          <p className="mt-4 text-5xl font-bold tracking-tight sm:text-6xl">{priceDisplay}</p>
        ) : (
          <p className="mt-4 text-2xl font-semibold leading-snug text-white/95 sm:text-3xl">
            {copy.pricePending}
          </p>
        )}
        <p className="mt-2 text-lg text-white/85 sm:text-xl">
          {priceDisplay ? copy.perMonth : copy.noHiddenCosts}
        </p>
        {priceDisplay ? (
          <p className="mt-3 text-base text-white/80 sm:text-lg">{copy.noHiddenCosts}</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[#2c2416] sm:text-3xl">{copy.includesHeading}</h2>
        <ul className="space-y-3">
          {copy.includes.map((item) => (
            <li
              key={item}
              className="flex gap-4 rounded-2xl border border-[#e8dfd0]/80 bg-white px-4 py-3 text-lg font-semibold leading-relaxed text-[#5c4a32] sm:text-xl"
            >
              <span
                className="mt-0.5 shrink-0 text-3xl font-black leading-none text-[#05381F] sm:text-4xl"
                aria-hidden="true"
              >
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[#2c2416] sm:text-3xl">{copy.forWhoHeading}</h2>
        <ul className="list-disc space-y-2 pl-6 text-lg leading-relaxed text-[#5c4a32] sm:text-xl">
          {copy.forWho.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className={`inline-flex min-h-[3.25rem] flex-1 items-center justify-center px-6 py-3 text-xl font-bold ${companionStartButtonClass}`}
        >
          {copy.ctaStart}
        </Link>
        <Link
          href="/register"
          className="inline-flex min-h-[3.25rem] flex-1 items-center justify-center rounded-2xl border-2 border-[#4a6741] bg-white px-6 py-3 text-xl font-semibold text-[#2c4a22] transition hover:bg-[#f5f0e8]"
        >
          {copy.ctaRegister}
        </Link>
      </div>

      <p className="text-base leading-relaxed text-[#8a7a66] sm:text-lg">{copy.footnote}</p>
    </AppPagePanel>
  );
}

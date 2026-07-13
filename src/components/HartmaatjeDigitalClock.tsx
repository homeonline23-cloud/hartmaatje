"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getVoiceLocaleForLang } from "@/lib/languages";

type HartmaatjeDigitalClockProps = {
  variant?: "cover" | "header" | "footer";
};

function formatClock(now: Date, locale: string, hour12: boolean) {
  return {
    time: now.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12,
    }),
    date: now.toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  };
}

function wrapperClass(variant: HartmaatjeDigitalClockProps["variant"]) {
  const isCover = variant === "cover";
  const isFooter = variant === "footer";
  if (isFooter) return "text-center";
  if (isCover) {
    return "rounded-2xl bg-black/45 px-4 py-2.5 text-center shadow-[0_4px_20px_rgba(0,0,0,0.35)] backdrop-blur-sm";
  }
  return "mb-1 rounded-2xl bg-black/30 px-4 py-2 text-center shadow-[0_4px_16px_rgba(0,0,0,0.25)] backdrop-blur-sm";
}

function timeClass(variant: HartmaatjeDigitalClockProps["variant"]) {
  const isCover = variant === "cover";
  const isFooter = variant === "footer";
  if (isFooter) return "text-3xl sm:text-[2.1rem]";
  if (isCover) return "text-4xl sm:text-[2.75rem]";
  return "text-3xl sm:text-4xl";
}

function dateClass(variant: HartmaatjeDigitalClockProps["variant"]) {
  const isCover = variant === "cover";
  const isFooter = variant === "footer";
  if (isFooter) return "text-sm";
  if (isCover) return "text-sm sm:text-base";
  return "text-xs sm:text-sm";
}

/** Grote digitale klok — alleen client-side om hydration-fouten te vermijden. */
export function HartmaatjeDigitalClock({
  variant = "header",
}: HartmaatjeDigitalClockProps) {
  const { lang } = useLanguage();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const wrapper = wrapperClass(variant);
  const timeSize = timeClass(variant);
  const dateSize = dateClass(variant);

  if (!now) {
    return (
      <div className={wrapper} aria-hidden="true">
        <span
          className={`block font-bold tabular-nums tracking-wide text-transparent ${timeSize}`}
        >
          00:00
        </span>
        <span className={`mt-0.5 block font-medium text-transparent ${dateSize}`}>
          &nbsp;
        </span>
      </div>
    );
  }

  const locale = getVoiceLocaleForLang(lang);
  const hour12 = lang === "en";
  const { time, date } = formatClock(now, locale, hour12);

  return (
    <div className={wrapper} aria-live="polite" aria-label={`${time}, ${date}`}>
      <time
        dateTime={now.toISOString()}
        className={`block font-bold tabular-nums tracking-wide text-white drop-shadow-md ${timeSize}`}
      >
        {time}
      </time>
      <p className={`mt-0.5 font-medium capitalize text-white/90 drop-shadow ${dateSize}`}>
        {date}
      </p>
    </div>
  );
}

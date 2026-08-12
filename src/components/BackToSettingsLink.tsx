"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/LanguageProvider";

/** Upper-right arrow back to Instellingen on policy / legal pages. */
export function BackToSettingsLink() {
  const { t } = useI18n();

  return (
    <Link
      href="/instellingen"
      className="inline-flex items-center gap-1.5 rounded-xl border border-[#e8dfd0] bg-white/90 px-3 py-2 text-sm font-bold text-[#3f6339] shadow-sm transition hover:bg-white active:scale-[0.98] sm:text-base"
      aria-label={t.settings.backToSettings}
    >
      <span aria-hidden="true" className="text-lg leading-none">
        ←
      </span>
      <span>{t.nav.settings}</span>
    </Link>
  );
}

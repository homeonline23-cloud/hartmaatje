"use client";

import { APP_LANGS, LOCALES, type AppLang } from "@/i18n/config";
import { useI18n } from "@/i18n/LanguageProvider";

type Props = {
  className?: string;
  size?: "sm" | "lg" | "cover";
  /** Match Over/Prijs button chrome + height */
  asNavButton?: boolean;
};

export function LanguageSwitcher({
  className = "",
  size = "sm",
  asNavButton = false,
}: Props) {
  const { lang, setLang, t } = useI18n();

  const isCover = asNavButton && size === "cover";

  const pad = asNavButton
    ? isCover
      ? "min-h-0 min-w-0 px-1.5 py-0.5 !text-xl"
      : "min-h-0 min-w-0 px-1 py-0.5 !text-xl"
    : size === "lg"
      ? "min-h-11 min-w-[2.75rem] px-2.5 text-xl"
      : "min-h-[2.6rem] min-w-[2.3rem] px-1.5 py-1 text-base sm:text-lg";

  const shell = asNavButton
    ? isCover
      ? `hm-btn hm-btn-secondary !flex !min-h-[3.5rem] w-full min-w-0 !flex-wrap items-center justify-center gap-1 !px-2 !py-2.5 !text-xl font-bold ${className}`
      : `hm-btn hm-btn-secondary !min-h-11 w-full min-w-0 !px-1.5 !py-2 !text-xl font-bold ${className}`
    : `inline-flex h-full max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl bg-black/25 p-1 ring-1 ring-white/25 backdrop-blur-sm ${className}`;

  return (
    <div
      className={asNavButton ? `${shell} !flex flex-wrap gap-1` : shell}
      role="group"
      aria-label={t.lang.pickerTitle}
    >
      {APP_LANGS.map((id: AppLang) => {
        const meta = LOCALES[id];
        const active = id === lang;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setLang(id)}
            aria-pressed={active}
            aria-label={meta.nativeLabel}
            title={meta.nativeLabel}
            className={`${pad} rounded-xl font-bold tracking-wide transition ${
              active
                ? "bg-white text-[#3f6339] shadow-md"
                : "text-white hover:bg-white/15"
            }`}
          >
            {meta.shortLabel}
          </button>
        );
      })}
    </div>
  );
}

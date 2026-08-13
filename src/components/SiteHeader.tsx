"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DigitalClock } from "@/components/DigitalClock";
import { HartmaatjeBrandTitle } from "@/components/HartmaatjeBrandTitle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/LanguageProvider";

const navBtn =
  "hm-btn w-full min-w-0 !min-h-11 !px-2.5 !py-2 !text-xl font-bold leading-tight text-center whitespace-pre-line";
const navBtnCompact =
  "hm-btn w-full min-w-0 !min-h-10 !px-2 !py-1.5 !text-lg font-bold leading-tight text-center whitespace-pre-line";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const navPrimary = [
    { href: "/app/video", label: t.nav.listenToStories },
    { href: "/app/over", label: t.nav.about },
  ];
  const navSecondary = [
    { href: "/", label: t.nav.home },
    { href: "/app/geheugen", label: t.nav.memory },
    { href: "/app/instellingen", label: t.nav.settings },
  ];

  const btn = compact ? navBtnCompact : navBtn;

  return (
    <header className="relative z-20 bg-transparent">
      <div
        className={`hm-shell flex flex-col items-center ${
          compact ? "gap-1.5 pb-1 pt-2" : "gap-2.5 pb-2 pt-3"
        }`}
      >
        <Link
          href="/"
          className={`relative flex flex-col items-center rounded-2xl transition hover:opacity-90 active:scale-[0.98] ${
            compact ? "gap-0.5" : "gap-1"
          }`}
          aria-label="HartMaatje home"
        >
          <div className="relative flex items-center justify-center">
            <Image
              src="/hartmaatje-logo.png"
              alt="HartMaatje logo"
              width={120}
              height={120}
              unoptimized
              className="hm-brand-logo relative z-10 drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)]"
              priority
            />
          </div>
          <HartmaatjeBrandTitle
            variant="header"
            className="relative z-10 mt-1"
          />
          <p className="relative z-10 mt-0.5 max-w-md text-center text-sm font-medium leading-snug text-white/90 sm:text-base">
            {t.brand.tagline}
          </p>
        </Link>

        <nav
          className={`flex w-full flex-col ${compact ? "mt-0 gap-1" : "mt-1 gap-1.5"}`}
          aria-label={t.nav.mainNav}
        >
          <div className={`grid w-full grid-cols-3 ${compact ? "gap-1" : "gap-1.5"}`}>
            {navSecondary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${btn} ${isActive(item.href) ? "hm-btn-primary" : "hm-btn-secondary"}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className={`grid w-full grid-cols-3 ${compact ? "gap-1" : "gap-1.5"}`}>
            {navPrimary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${btn} ${isActive(item.href) ? "hm-btn-primary" : "hm-btn-secondary"}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className={`grid w-full grid-cols-3 ${compact ? "gap-1" : "gap-1.5"}`}>
            <LanguageSwitcher asNavButton />
            <Link
              href="/verhalen"
              className={`${btn} ${isActive("/verhalen") ? "hm-btn-primary" : "hm-btn-secondary"}`}
            >
              {t.nav.listenToStories}
            </Link>
            <DigitalClock asWindow />
          </div>
        </nav>
      </div>
    </header>
  );
}

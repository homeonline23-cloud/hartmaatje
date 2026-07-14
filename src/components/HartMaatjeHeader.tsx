"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguagePicker } from "@/components/LanguagePicker";
import { HartmaatjeBrandTitle } from "@/components/HartmaatjeBrandTitle";
import { LogoRainbowHalo } from "@/components/LogoRainbowHalo";
import { useLanguage } from "@/context/LanguageContext";
import { useHomeCompanionOptional } from "@/context/HomeCompanionContext";

const navBtn =
  "flex h-9 w-full min-w-0 items-center justify-center rounded-xl px-1 py-1 text-center text-xs font-bold leading-tight touch-manipulation active:scale-[0.98] transition sm:h-10 sm:px-1.5 sm:text-sm";

const navActive =
  "bg-white text-[#3f6339] shadow-[0_6px_14px_rgba(255,255,255,0.28)] ring-2 ring-white/60";
const navIdle =
  "bg-white/18 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)] hover:bg-white/28";

export function HartMaatjeHeader() {
  const pathname = usePathname();
  const { copy, app } = useLanguage();

  const primaryNav = [
    { href: "/app/video", label: copy.navVideo },
    { href: "/app/over", label: copy.navAbout },
    { href: "/app/prijzen", label: copy.navPricing },
  ] as const;

  const secondaryNav = [
    { href: "/", label: copy.navHome },
    { href: "/app/geheugen", label: copy.navMemory },
    { href: "/app/instellingen", label: copy.navSettings },
  ] as const;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const companion = useHomeCompanionOptional();

  const goCleanHome = (e?: React.MouseEvent) => {
    companion?.resetToCleanHome();
    if (pathname === "/") {
      e?.preventDefault();
    }
  };

  return (
    <header className="relative z-20 bg-transparent">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2 px-4 py-2">
        <div className="relative flex flex-col items-center">
          <LogoRainbowHalo />
          <Link
            href="/"
            onClick={(e) => goCleanHome(e)}
            className="relative z-10 flex flex-col items-center gap-1 rounded-2xl transition hover:opacity-90 active:scale-[0.98]"
            aria-label={app.header.homeAria}
          >
            <Image
              src="/hartmaatje-logo.png"
              alt="HartMaatje logo"
              width={128}
              height={128}
              unoptimized
              className="h-32 w-32 object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.48),0_0_26px_rgba(255,255,255,0.22)]"
              priority
            />
            <HartmaatjeBrandTitle variant="header" />
          </Link>
        </div>

        <nav
          className="mt-3 flex w-full flex-col gap-1.5 sm:gap-2"
          aria-label={app.header.mainNavAria}
        >
          <div className="grid w-full grid-cols-4 gap-1.5 sm:gap-2">
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${navBtn} ${isActive(item.href) ? navActive : navIdle}`}
              >
                {item.label}
              </Link>
            ))}
            <LanguagePicker
              className="min-w-0"
              buttonClassName={`${navBtn} ${navIdle}`}
            />
          </div>
          <div className="grid w-full grid-cols-3 gap-1.5 sm:gap-2">
            {secondaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={item.href === "/" ? (e) => goCleanHome(e) : undefined}
                className={`${navBtn} ${isActive(item.href) ? navActive : navIdle}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}

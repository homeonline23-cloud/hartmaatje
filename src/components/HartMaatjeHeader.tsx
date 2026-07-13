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
  "flex h-12 w-full min-w-0 items-center justify-center rounded-2xl px-1.5 py-2 text-center text-sm font-bold leading-tight touch-manipulation active:scale-[0.98] transition sm:px-2 sm:text-base";

const navActive =
  "bg-white text-[#3f6339] shadow-[0_8px_18px_rgba(255,255,255,0.28)] ring-2 ring-white/60";
const navIdle =
  "bg-white/18 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)] hover:bg-white/28";

export function HartMaatjeHeader() {
  const pathname = usePathname();
  const { copy, app } = useLanguage();

  const navItems = [
    { href: "/", label: copy.navHome },
    { href: "/app/geheugen", label: copy.navMemory },
    { href: "/app/instellingen", label: copy.navSettings },
    { href: "/app/over", label: copy.navAbout },
    { href: "/app/prijzen", label: copy.navPricing },
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
          className="mt-4 grid w-full grid-cols-3 gap-2"
          aria-label={app.header.mainNavAria}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={item.href === "/" ? (e) => goCleanHome(e) : undefined}
              className={`${navBtn} ${isActive(item.href) ? navActive : navIdle}`}
            >
              {item.label}
            </Link>
          ))}
          <LanguagePicker
            className="min-w-0"
            buttonClassName={`${navBtn} ${navIdle}`}
          />
        </nav>
      </div>
    </header>
  );
}

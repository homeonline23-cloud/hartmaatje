"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguagePicker } from "@/components/LanguagePicker";
import { LogoRainbowHalo } from "@/components/LogoRainbowHalo";
import { useLanguage } from "@/context/LanguageContext";
import { useHomeCompanionOptional } from "@/context/HomeCompanionContext";

const navBtn =
  "flex min-h-12 flex-1 min-w-0 items-center justify-center rounded-2xl px-2 py-3 text-center text-base font-bold leading-tight touch-manipulation active:scale-[0.98] transition";

export function HartMaatjeHeader() {
  const pathname = usePathname();
  const { copy, app } = useLanguage();

  const navItems = [
    { href: "/", label: copy.navHome },
    { href: "/app/geheugen", label: copy.navMemory },
    { href: "/app/instellingen", label: copy.navSettings },
  ] as const;

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
              className="h-32 w-32 object-contain drop-shadow-[0_0_24px_rgba(255,255,255,0.25)]"
              priority
            />
            <span className="text-xl font-bold text-white drop-shadow-md sm:text-2xl">
              HartMaatje
            </span>
          </Link>
        </div>

        <nav className="mt-4 w-full space-y-2" aria-label={app.header.mainNavAria}>
          <div className="flex w-full gap-2">
            {navItems.slice(0, 3).map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={
                    item.href === "/" ? (e) => goCleanHome(e) : undefined
                  }
                  className={`${navBtn} ${
                    active
                      ? "bg-white text-[#3f6339] shadow-[0_8px_18px_rgba(255,255,255,0.28)] ring-2 ring-white/60"
                      : "bg-white/18 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)] hover:bg-white/28"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="flex w-full gap-2">
            <Link
              href="/app/over"
              className={`${navBtn} ${
                pathname.startsWith("/app/over")
                  ? "bg-white text-[#3f6339] shadow-[0_8px_18px_rgba(255,255,255,0.28)] ring-2 ring-white/60"
                  : "bg-white/18 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)] hover:bg-white/28"
              }`}
            >
              {copy.navAbout}
            </Link>
            <LanguagePicker
              className="flex flex-1 min-w-0"
              buttonClassName={`${navBtn} w-full bg-white/18 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)] hover:bg-white/28`}
            />
          </div>
        </nav>
      </div>
    </header>
  );
}

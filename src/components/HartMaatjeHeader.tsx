"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/app", label: "Gesprek" },
  { href: "/app/geheugen", label: "Geheugen" },
  { href: "/app/instellingen", label: "Instellingen" },
  { href: "/app/privacy", label: "Privacy" },
] as const;

export function HartMaatjeHeader() {
  const pathname = usePathname();

  return (
    <header className="relative z-10 bg-transparent">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2 px-4 py-2">
        <Link
          href="/"
          className="flex flex-col items-center gap-1 rounded-2xl transition hover:opacity-90"
          aria-label="HartMaatje — startpagina"
        >
          <Image
            src="/logo.png"
            alt="HartMaatje logo"
            width={112}
            height={112}
            unoptimized
            className="h-28 w-28 rounded-full object-contain drop-shadow-[0_0_24px_rgba(255,255,255,0.25)]"
            priority
          />
          <span className="text-xl font-bold text-white drop-shadow-md sm:text-2xl">
            HartMaatje
          </span>
        </Link>
        <nav
          className="mt-5 flex flex-wrap items-center justify-center gap-1 sm:mt-6"
          aria-label="Hoofdmenu"
        >
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/app"
                  ? pathname === "/app"
                  : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-1.5 text-base font-semibold transition sm:px-3.5 sm:py-2 sm:text-lg ${
                  active
                    ? "bg-white/95 text-[#4a6741] shadow-lg shadow-white/20"
                    : "text-white/90 hover:bg-white/15"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

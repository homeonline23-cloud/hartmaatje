"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { HartmaatjeDigitalClock } from "@/components/HartmaatjeDigitalClock";

const ROOM_PATHS = [
  "/maatjes",
  "/gesprek",
  "/bioscoop",
  "/verhalen",
  "/kiosk",
  "/dubber",
  "/over",
  "/prijzen",
  "/privacy",
  "/contact",
  "/cookies",
  "/instellingen",
  "/geheugen",
];

/** Site wrapper — digitale klok onderaan, except original room pages that have their own clock. */
export function HartMaatjeSiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const roomPage = ROOM_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  return (
    <div className={`relative min-h-full ${roomPage ? "" : "pb-[5.25rem]"}`}>
      {children}
      {roomPage ? null : (
        <footer
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-[#0a2a18]/96 via-[#0a2a18]/88 to-transparent px-4 pb-3 pt-3"
          aria-label="Klok"
        >
          <HartmaatjeDigitalClock variant="footer" />
        </footer>
      )}
    </div>
  );
}

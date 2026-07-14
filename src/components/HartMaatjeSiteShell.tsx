"use client";

import type { ReactNode } from "react";
import { HartmaatjeDigitalClock } from "@/components/HartmaatjeDigitalClock";

/** Site wrapper — digitale klok onderaan op elke pagina. */
export function HartMaatjeSiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-full pb-[5.25rem]">
      {children}
      <footer
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-[#0a2a18]/96 via-[#0a2a18]/88 to-transparent px-4 pb-3 pt-3"
        aria-label="Klok"
      >
        <HartmaatjeDigitalClock variant="footer" />
      </footer>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";

/** Alleen inhoud — achtergrond per pagina (niet op voorpagina-boekkaft). */
export function HartMaatjeSiteShell({ children }: { children: ReactNode }) {
  return <div className="relative min-h-full">{children}</div>;
}

"use client";

import type { ReactNode } from "react";
import { FrontDeskButton } from "@/components/FrontDeskButton";
import { PageBackground } from "@/components/PageBackground";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

/** Fase-1 app shell — tablet/laptop, senior-friendly. */
export function AppShell({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative flex min-h-screen flex-col overflow-x-hidden ${compact ? "pb-4" : "pb-8"}`}
    >
      <PageBackground />
      <SiteHeader compact={compact} />
      <main
        className={`hm-shell relative z-10 flex-1 ${compact ? "py-1 pb-4" : "py-2 pb-6"}`}
      >
        {children}
      </main>
      <SiteFooter />
      <FrontDeskButton />
    </div>
  );
}

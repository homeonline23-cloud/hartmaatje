"use client";

import type { ReactNode } from "react";
import { FrontDeskButton } from "@/components/FrontDeskButton";
import { HartMaatjeHeader } from "@/components/HartMaatjeHeader";
import { InnerPageBackground } from "@/components/InnerPageBackground";
import { LanguageProvider as RoomI18nProvider } from "@/i18n/LanguageProvider";

/** Original HartMaatje rooms — tablet/laptop, senior-friendly. */
export function AppShell({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <RoomI18nProvider>
      <div
        className={`relative flex min-h-screen flex-col overflow-x-hidden ${compact ? "pb-4" : "pb-8"}`}
      >
        <InnerPageBackground />
        <HartMaatjeHeader />
        <main
          className={`relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 ${compact ? "py-1 pb-4" : "py-2 pb-6"}`}
        >
          {children}
        </main>
        <FrontDeskButton />
      </div>
    </RoomI18nProvider>
  );
}

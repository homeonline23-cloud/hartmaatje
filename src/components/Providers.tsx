"use client";

import { HomeAudioSilence } from "@/components/HomeAudioSilence";
import { LanguageProvider } from "@/i18n/LanguageProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <HomeAudioSilence />
      {children}
    </LanguageProvider>
  );
}

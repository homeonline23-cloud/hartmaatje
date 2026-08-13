"use client";

import { AppShell } from "@/components/AppShell";
import { HomeCharacterLanding } from "@/components/HomeCharacterLanding";

/** Same portraits + welcome video as the home landing. */
export default function MaatjesPage() {
  return (
    <AppShell compact>
      <HomeCharacterLanding />
    </AppShell>
  );
}

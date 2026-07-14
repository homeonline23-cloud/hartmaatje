"use client";

import { ProfileRecoveryGate } from "@/components/auth/ProfileRecoveryGate";
import { Emergency112Button } from "@/components/Emergency112Button";
import { HartMaatjeHeader } from "@/components/HartMaatjeHeader";
import { InnerPageBackground } from "@/components/InnerPageBackground";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <InnerPageBackground />
      <HartMaatjeHeader />
      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 py-4 pb-28">
        <ProfileRecoveryGate>{children}</ProfileRecoveryGate>
      </main>
      <Emergency112Button />
    </div>
  );
}

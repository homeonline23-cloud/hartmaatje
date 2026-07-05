"use client";

import { CalmBackground } from "@/components/ui";
import { Emergency112Button } from "@/components/Emergency112Button";
import { HartMaatjeHeader } from "@/components/HartMaatjeHeader";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <CalmBackground />
      <HartMaatjeHeader />
      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 py-4">
        {children}
      </main>
      <Emergency112Button />
    </div>
  );
}

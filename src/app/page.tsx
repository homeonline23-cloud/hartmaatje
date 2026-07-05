"use client";

import { useRouter } from "next/navigation";
import { Emergency112Button } from "@/components/Emergency112Button";
import { HartMaatjeHeader } from "@/components/HartMaatjeHeader";
import { StartConversationButton } from "@/components/StartConversationButton";
import { CalmBackground } from "@/components/ui";

export default function Home() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <CalmBackground />
      <HartMaatjeHeader />
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-2">
        <div className="rounded-3xl bg-[#faf6f0]/93 p-4 shadow-xl backdrop-blur-md sm:p-5">
          <h1 className="mb-1 text-center text-2xl font-bold leading-tight text-[#2c2416]">
            Fijn dat u er bent
          </h1>

          <p className="mb-3 text-center text-lg leading-snug text-[#5c4a32]">
            Ik ben hier om rustig naar u te luisteren.
          </p>

          <div className="rounded-2xl bg-[#f5f0e8] px-4 py-2.5 text-center">
            <p className="text-base font-medium leading-snug text-[#3d3226]">
              Vertel gerust hoe het met u gaat — ik luister graag.
            </p>
          </div>

          <StartConversationButton onClick={() => router.push("/app")} />
        </div>
      </main>
      <Emergency112Button />
    </div>
  );
}

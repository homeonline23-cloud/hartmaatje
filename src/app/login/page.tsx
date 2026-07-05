"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CalmBackground } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="relative min-h-screen">
      <CalmBackground />
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <p className="text-xl text-[#2c2416]">Even geduld…</p>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { InnerPageBackground } from "@/components/InnerPageBackground";
import { useLanguageOptional } from "@/context/LanguageContext";

/** Registratie tijdelijk uit — ouderen hoeven geen account aan te maken. */
export default function RegisterPage() {
  const router = useRouter();
  const { app } = useLanguageOptional();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <>
      <InnerPageBackground />
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <p className="text-xl text-white drop-shadow-md">{app.common.loading}</p>
      </div>
    </>
  );
}

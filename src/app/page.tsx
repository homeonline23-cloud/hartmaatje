"use client";

import { useRouter } from "next/navigation";
import { HomeBookCover } from "@/components/HomeBookCover";

/** Frontpage cover only — companion picker lives at /maatjes. */
export default function HomePage() {
  const router = useRouter();

  return <HomeBookCover onOpen={() => router.push("/maatjes")} />;
}

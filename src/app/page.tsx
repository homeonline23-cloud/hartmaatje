"use client";

import { HomeBookCover } from "@/components/HomeBookCover";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return <HomeBookCover onOpen={() => router.push("/maatjes")} />;
}

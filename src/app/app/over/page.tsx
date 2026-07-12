"use client";

import { useLanguage } from "@/context/LanguageContext";
import { AppPagePanel } from "@/components/AppPagePanel";

export default function OverPage() {
  const { copy } = useLanguage();

  return (
    <AppPagePanel title={copy.differentiatorHeading} intro={copy.differentiatorBody} />
  );
}

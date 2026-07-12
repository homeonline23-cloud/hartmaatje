"use client";

import { AppPagePanel } from "@/components/AppPagePanel";
import { SafetyTestPrintSheet } from "@/components/settings/SafetyTestPrintSheet";
import { useLanguage } from "@/context/LanguageContext";

export default function VeiligheidstestPage() {
  const { app } = useLanguage();
  return (
    <AppPagePanel title={app.settings.safetyTest.pageTitle}>
      <SafetyTestPrintSheet />
    </AppPagePanel>
  );
}

"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { FrontDeskSettingsModal } from "@/components/FrontDeskSettingsModal";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { VolumeControlPanel } from "@/components/VolumeControlPanel";
import { LOCALES } from "@/i18n/config";
import { useI18n } from "@/i18n/LanguageProvider";

const card =
  "rounded-xl border border-[#e8dfd0] bg-white/70 px-3 py-2 text-base text-[#3f6339]";
const title = "font-semibold text-[#3f6339]";
const link =
  "mt-1 text-sm font-semibold text-[#3f6339] underline underline-offset-2";

export default function InstellingenPage() {
  return (
    <AppShell compact>
      <InstellingenContent />
    </AppShell>
  );
}

/** Needs to render inside AppShell's own LanguageProvider, not above it. */
function InstellingenContent() {
  const { t, lang } = useI18n();
  const [frontDeskOpen, setFrontDeskOpen] = useState(false);
  return (
    <>
      <section className="hm-card px-3 py-3 pb-20">
        <h2 className="text-center font-[family-name:var(--font-display)] text-xl font-semibold text-[#3f6339]">
          {t.settings.title}
        </h2>
        <div className="mt-3 space-y-1.5">
          <div className={card}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className={`${title} shrink-0`}>{t.settings.language}</p>
              <p className="shrink-0 text-sm text-[#3f6339]">
                {LOCALES[lang].nativeLabel}
              </p>
              <div className="ml-auto min-w-0">
                <LanguageSwitcher size="sm" />
              </div>
            </div>
          </div>
          <VolumeControlPanel compact />
          <div className={card}>
            <p className={title}>{t.settings.mic}</p>
            <p className={link}>
              <a href="/mic-test">Open microfoon-test →</a>
            </p>
          </div>
          <div className={card}>
            <p className={title}>Privacy</p>
            <p className={link}>
              <a href="/privacy">
                {lang === "nl"
                  ? "Lees de privacytekst →"
                  : "Read the privacy policy →"}
              </a>
            </p>
          </div>
          <div className={card}>
            <p className={title}>Contact us</p>
            <p className={link}>
              <a href="/contact">Contact us →</a>
            </p>
          </div>
          <div className={card}>
            <p className={title}>{t.frontDesk.label}</p>
            <button
              type="button"
              onClick={() => setFrontDeskOpen(true)}
              className={`${link} text-left`}
            >
              {t.frontDesk.settingsTitle} →
            </button>
          </div>
          <div className={card}>
            <p className={title}>{t.settings.dubberTitle}</p>
            <p className={link}>
              <a href="/dubber">{t.settings.dubberLink}</a>
            </p>
          </div>
        </div>
      </section>

      <FrontDeskSettingsModal
        isOpen={frontDeskOpen}
        onClose={() => setFrontDeskOpen(false)}
      />
    </>
  );
}

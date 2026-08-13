"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { CompanionWelcomeIntro } from "@/components/CompanionWelcomeIntro";
import { LiveCompanionFace } from "@/components/LiveCompanionFace";
import { VoiceSessionPanel } from "@/components/VoiceSessionPanel";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import { useI18n } from "@/i18n/LanguageProvider";
import {
  type CompanionId,
  getCompanion,
} from "@/lib/companions";
import { silenceHmMedia } from "@/lib/hmMedia";

type Props = {
  companionId: CompanionId;
  companionName: string;
  portrait: string;
};

export function GesprekContent({
  companionId,
  companionName,
  portrait,
}: Props) {
  const { t } = useI18n();
  const [introDone, setIntroDone] = useState(false);
  const session = useVoiceSession(companionId);
  const { startContinuousChat, ui } = session;
  const crop = getCompanion(companionId)?.portraitCrop ?? null;
  const liveOn = ui.micLive || ui.phase === "speaking" || ui.starting;

  const beginConversation = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    silenceHmMedia();
    setIntroDone(true);
    void startContinuousChat();
  }, [startContinuousChat]);

  if (!introDone) {
    return (
      <CompanionWelcomeIntro
        companionId={companionId}
        companionName={companionName}
        continueLabel={t.conversation.welcomeVideoContinue}
        onContinue={beginConversation}
      />
    );
  }

  return (
    <section className="hm-card mx-auto w-full space-y-2 overflow-hidden px-2 pb-3 pt-2 sm:px-3">
      {/* Living character — face first, not a chatboard */}
      <LiveCompanionFace
        companionId={companionId}
        companionName={companionName}
        portrait={portrait}
        portraitCrop={crop}
        liveCharacter
        expanded
        speaking={ui.phase === "speaking"}
        listening={ui.micLive && ui.phase !== "speaking"}
        speechLevel={ui.speechLevel}
      />

      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-2">
        <VoiceSessionPanel
          companionName={companionName}
          session={session}
          compact
          hidePortrait
          liveCharacter
        />

        <Link
          href="/maatjes"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-[#3f6339] bg-white/80 px-4 py-2 text-center text-base font-bold text-[#3f6339] transition hover:bg-white"
        >
          {t.conversation.backToCompanions}
        </Link>

        {!liveOn ? (
          <p className="text-center text-sm font-semibold text-[#3f6339]/80">
            Tik Aan — {companionName} is er live voor u.
          </p>
        ) : null}
      </div>
    </section>
  );
}

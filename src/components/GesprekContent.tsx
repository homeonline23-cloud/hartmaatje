"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { CompanionVoiceSession } from "@/components/CompanionVoiceSession";
import { CompanionWelcomeIntro } from "@/components/CompanionWelcomeIntro";
import { LiveCompanionFace } from "@/components/LiveCompanionFace";
import { useI18n } from "@/i18n/LanguageProvider";
import { getCompanion, type CompanionId } from "@/lib/companions";
import { silenceHmMedia } from "@/lib/hmMedia";
import type { VoiceIdentityId } from "@/lib/voice/types";

type VoicePhase =
  | "idle"
  | "starting"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

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
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const crop = getCompanion(companionId)?.portraitCrop ?? null;
  const liveOn = phase === "listening" || phase === "speaking" || phase === "starting";

  const beginConversation = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    silenceHmMedia();
    setIntroDone(true);
  }, []);

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
      <LiveCompanionFace
        companionId={companionId}
        companionName={companionName}
        portrait={portrait}
        portraitCrop={crop}
        liveCharacter
        expanded
        speaking={phase === "speaking"}
        listening={phase === "listening" || phase === "thinking"}
      />

      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-2">
        <CompanionVoiceSession
          identityId={companionId as VoiceIdentityId}
          skipWelcome
          hidePortrait
          onPhaseChange={setPhase}
          onBack={() => {
            window.location.href = "/maatjes";
          }}
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

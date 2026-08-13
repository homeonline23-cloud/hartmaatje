"use client";

import { useEffect, useRef } from "react";
import { MicWindow } from "@/components/MicWindow";
import type { useVoiceSession } from "@/hooks/useVoiceSession";
import { useI18n } from "@/i18n/LanguageProvider";

export type VoiceSessionControls = ReturnType<typeof useVoiceSession>;

type Props = {
  companionName: string;
  session: VoiceSessionControls;
  /** Tighter layout (Bioscoop Kamer) */
  compact?: boolean;
  /** Mic only — for cinema overlay so you can keep talking */
  micOnly?: boolean;
  /** Face shown elsewhere (welcome-sized LiveCompanionFace) */
  hidePortrait?: boolean;
  /** Living-character mode: tiny transcript, focus on mic + face */
  liveCharacter?: boolean;
  companionPortrait?: string;
  companionPortraitCrop?: { scale: string; position: string } | null;
};

/** Voice-only conversation panel — no typing (senior-friendly). */
export function VoiceSessionPanel({
  companionName,
  session,
  compact = false,
  micOnly = false,
  hidePortrait = false,
  liveCharacter = false,
  companionPortrait,
  companionPortraitCrop = null,
}: Props) {
  const { t } = useI18n();
  const { ui, startContinuousChat, closeChat } = session;
  const chatRef = useRef<HTMLDivElement>(null);
  const streaming = ui.chat.some((line) => line.streaming);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: streaming ? "auto" : "smooth",
    });
  }, [ui.chat, streaming]);

  return (
    <div className={compact || micOnly ? "space-y-3" : "space-y-4"}>
      {ui.errorMessage ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-lg leading-relaxed text-red-900 whitespace-pre-line"
        >
          {ui.errorMessage}
        </div>
      ) : null}

      <MicWindow
        micLive={ui.micLive}
        userSpeaking={ui.userSpeaking}
        micLevel={ui.micLevel}
        phase={ui.phase}
        statusLabel={ui.statusLabel}
        starting={ui.starting}
        startLabel={t.conversation.startVoiceChat}
        stopLabel={t.conversation.closeChat}
        onStart={() => void startContinuousChat()}
        onStop={() => void closeChat()}
        compact={compact || micOnly}
        companionName={hidePortrait ? undefined : companionName}
        companionPortrait={hidePortrait ? undefined : companionPortrait}
        companionPortraitCrop={hidePortrait ? null : companionPortraitCrop}
        avatarVideoUrl={hidePortrait ? null : ui.avatarVideoUrl}
      />

      {!micOnly ? (
        <div
          ref={chatRef}
          className={`overflow-y-auto rounded-2xl border border-[#e8dfd0] bg-white/75 ${
            liveCharacter
              ? "max-h-20 space-y-1 px-2.5 py-1.5 opacity-90"
              : compact
                ? "max-h-28 space-y-1.5 px-3 py-2"
                : "max-h-36 space-y-2 px-4 py-2.5"
          }`}
        >
          {ui.chat.length === 0 ? (
            <p
              className={`text-center text-[#3f6339] ${
                compact ? "text-sm" : "text-base"
              }`}
            >
              {t.conversation.transcriptEmpty}
            </p>
          ) : (
            ui.chat.map((line) => (
              <div
                key={line.id}
                className={`rounded-2xl leading-relaxed ${
                  compact ? "px-3 py-1.5 text-base" : "px-4 py-2 text-lg"
                } ${
                  line.role === "user"
                    ? "ml-3 bg-[#3f6339]/10 text-[#3f6339]"
                    : "mr-3 bg-white text-[#3f6339] shadow-sm"
                }`}
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-[#3f6339]">
                  {line.role === "user" ? "U" : companionName}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap">
                  {line.text.trim()
                    ? line.text
                    : line.role === "user"
                      ? "…"
                      : "…"}
                  {line.streaming ? (
                    <span
                      aria-hidden
                      className="ml-0.5 inline-block h-[1.1em] w-[0.45em] translate-y-[0.1em] animate-pulse bg-[#3f6339]/70 align-baseline"
                    />
                  ) : null}
                </p>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

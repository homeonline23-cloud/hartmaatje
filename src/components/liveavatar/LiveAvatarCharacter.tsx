"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveAvatarSession,
  SessionEvent,
} from "@heygen/liveavatar-web-sdk";

import { getVoiceIdentity } from "@/lib/voice/registry";
import type { VoiceIdentityId } from "@/lib/voice/types";
import { useLanguage } from "@/context/LanguageContext";
import { hartmaatjeGreenButtonClass } from "@/lib/hartmaatjeTheme";

export type LiveAvatarUiState =
  | "connecting"
  | "live"
  | "error"
  | "ended";

const KEEP_ALIVE_MS = 120_000;

type LiveAvatarCharacterProps = {
  identityId: VoiceIdentityId;
  animateKey: number | string;
  onSessionActiveChange?: (active: boolean) => void;
  /** Credits op of sessie niet beschikbaar — val terug op gewone microfoon. */
  onUnavailable?: () => void;
};

export function LiveAvatarCharacter({
  identityId,
  animateKey,
  onSessionActiveChange,
  onUnavailable,
}: LiveAvatarCharacterProps) {
  const { lang, copy } = useLanguage();
  const character = getVoiceIdentity(identityId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [uiState, setUiState] = useState<LiveAvatarUiState>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restartNonce, setRestartNonce] = useState(0);

  const stopSession = useCallback(async () => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) {
      try {
        await session.stop();
      } catch {
        /* session may already be closed */
      }
    }
    onSessionActiveChange?.(false);
  }, [onSessionActiveChange]);

  const endConversation = useCallback(() => {
    void stopSession().then(() => {
      setUiState("ended");
    });
  }, [stopSession]);

  const restartConversation = useCallback(() => {
    setErrorMessage(null);
    setUiState("connecting");
    setRestartNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      setUiState("connecting");
      setErrorMessage(null);
      onSessionActiveChange?.(false);

      try {
        const res = await fetch("/api/liveavatar/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterId: identityId,
            language: lang,
          }),
        });

        const payload = (await res.json()) as {
          sessionToken?: string;
          error?: string;
        };

        if (!res.ok || !payload.sessionToken) {
          throw new Error(payload.error ?? copy.liveAvatarError);
        }

        if (cancelled) return;

        const session = new LiveAvatarSession(payload.sessionToken, {
          voiceChat: true,
        });
        sessionRef.current = session;

        session.on(SessionEvent.SESSION_STREAM_READY, () => {
          const video = videoRef.current;
          if (video) session.attach(video);
          void session.voiceChat.start().catch(() => {
            setErrorMessage(copy.liveAvatarMicError);
            setUiState("error");
          });
          setUiState("live");
          onSessionActiveChange?.(true);
        });

        session.on(SessionEvent.SESSION_DISCONNECTED, () => {
          if (!cancelled) {
            setUiState("ended");
            onSessionActiveChange?.(false);
          }
        });

        await session.start();

        keepAliveRef.current = setInterval(() => {
          void sessionRef.current?.keepAlive();
        }, KEEP_ALIVE_MS);
      } catch (error) {
        if (cancelled) return;
        const raw =
          error instanceof Error ? error.message : copy.liveAvatarError;
        const creditsExhausted = /insufficient credits/i.test(raw);
        if (creditsExhausted) {
          onUnavailable?.();
          return;
        }
        setErrorMessage(raw);
        setUiState("error");
        onSessionActiveChange?.(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      void stopSession();
    };
  }, [
    animateKey,
    copy.liveAvatarError,
    copy.liveAvatarMicError,
    identityId,
    lang,
    onSessionActiveChange,
    onUnavailable,
    restartNonce,
    stopSession,
  ]);

  const statusText =
    uiState === "connecting"
      ? copy.liveAvatarConnecting(character.displayName)
      : uiState === "live"
        ? copy.liveAvatarListening(character.displayName)
        : uiState === "ended"
          ? copy.liveAvatarEnded
          : null;

  return (
    <div
      key={animateKey}
      className="hm-character-enter mx-auto mb-4 max-w-lg px-2"
      role="status"
      aria-live="polite"
      aria-label={character.displayName}
    >
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-[#e8dfd0]/70 bg-gradient-to-b from-[#fffdf9] to-[#f5f0e8]/95 px-5 py-5 shadow-[0_12px_28px_rgba(44,36,22,0.1)]">
        <div className="w-full overflow-hidden rounded-2xl border-2 border-white bg-[#2c2416] shadow-[0_10px_24px_rgba(44,36,22,0.18)]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={false}
            className={`aspect-[4/3] w-full object-cover ${
              uiState === "live" ? "opacity-100" : "opacity-40"
            }`}
          />
          {uiState === "connecting" ? (
            <p className="-mt-12 relative z-10 pb-4 text-center text-xl font-medium text-white/90 sm:text-2xl">
              {copy.liveAvatarConnecting(character.displayName)}
            </p>
          ) : null}
        </div>

        <div className="space-y-1 text-center">
          <p className="text-2xl font-bold text-[#2c4a22] sm:text-[1.75rem]">
            {character.displayName}
          </p>
          {statusText ? (
            <p className="text-lg font-medium text-[#4a6741] sm:text-xl">
              {statusText}
            </p>
          ) : null}
          {uiState === "live" ? (
            <p className="text-base leading-relaxed text-[#5c4a32] sm:text-lg">
              {copy.liveAvatarHint}
            </p>
          ) : null}
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="w-full rounded-2xl border border-[#d8a574] bg-[#fff8ee] px-4 py-3 text-lg text-[#6b4a2a] sm:text-xl"
          >
            {errorMessage}
          </p>
        ) : null}

        {uiState === "live" ? (
          <button
            type="button"
            onClick={endConversation}
            className="w-full rounded-2xl border-2 border-[#c45c3e]/40 bg-white px-6 py-4 text-xl font-semibold text-[#8b4a2a] shadow-sm transition hover:bg-[#fff5ee] sm:text-2xl"
          >
            {copy.liveAvatarEnd}
          </button>
        ) : null}

        {uiState === "ended" || uiState === "error" ? (
          <button
            type="button"
            onClick={restartConversation}
            className={`w-full px-6 py-4 text-xl font-semibold sm:text-2xl ${hartmaatjeGreenButtonClass}`}
          >
            {copy.liveAvatarRestart}
          </button>
        ) : null}
      </div>
    </div>
  );
}

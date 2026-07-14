"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AvatarPortrait } from "@/components/AvatarPortrait";
import { companionMediaBackdropClass, companionShellClass, companionStartButtonClass, MicGlyph } from "@/components/ui";
import { WelcomeVideoFrame } from "@/components/WelcomeVideoFrame";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { getCompanionOpening } from "@/lib/companion/openings";
import {
  getWelcomeVideoUrl,
  hasWelcomeVideo,
} from "@/lib/avatars";
import { ContinuousListener } from "@/lib/fenna-voice/continuousListener";
import { processCompanionVoiceTurn } from "@/lib/fenna-voice/fennaVoicePipeline";
import {
  interruptFennaAudio,
  isFennaAudioPlaying,
  playFennaAudio,
  unlockAudioPlayback,
} from "@/lib/fenna-voice/playback";
import { playCompanionReply, speakCompanionLine } from "@/lib/fenna-voice/speakFennaLine";
import { logTurnTimings, type TurnTimings } from "@/lib/fenna-voice/turnTiming";
import {
  beginVoiceTurn,
  completeVoiceTurn,
  exposeVoiceMetricsGlobally,
  failVoiceTurn,
  markBackendCompleted,
  markSttCompleted,
  recoverVoiceTurn,
  snapshotVoiceMetrics,
} from "@/lib/fenna-voice/voiceMetrics";
import { MicAccessError } from "@/lib/fenna-voice/micAccess";
import { logVoiceTranscriptLine, voiceLog } from "@/lib/fenna-voice/voiceLogger";
import {
  beginCompanionVoiceSession,
  endCompanionVoiceSession,
  getCompanionVoiceAbortSignal,
  isCompanionVoiceSessionActive,
} from "@/lib/fenna-voice/sessionControl";
import { friendlyGeminiErrorMessage, isApiErrorPayload } from "@/lib/geminiErrors";
import { isTtsQuotaFailure, getTtsErrorMessage } from "@/lib/fenna-voice/speakFennaLine";
import { CompanionApiError } from "@/lib/fenna-voice/fennaVoicePipeline";
import { hartmaatjeApi, storeBackendSessionId, type FennaMessage } from "@/lib/hartmaatje-api/client";
import { getGeminiPlaybackRate } from "@/lib/voice/geminiVoiceConfig";
import { getVoiceIdentity } from "@/lib/voice/registry";
import type { VoiceIdentityId } from "@/lib/voice/types";

type Phase = "idle" | "starting" | "listening" | "thinking" | "speaking" | "error";

const RESIDENT_KEY = "hartmaatje_resident";

export type CompanionVoiceSessionProps = {
  identityId: VoiceIdentityId;
  onBack?: () => void;
};

/** Zelfde voice-ervaring voor Fenna, Maarten, Peter en Colette. */
export function CompanionVoiceSession({
  identityId,
  onBack,
}: CompanionVoiceSessionProps) {
  const { copy, app, lang } = useLanguage();
  const { profile } = useAuth();
  const character = getVoiceIdentity(identityId);
  const displayName = character.displayName;
  const welcomeVideoSrc = getWelcomeVideoUrl(identityId);

  const [phase, setPhase] = useState<Phase>("idle");
  const [messages, setMessages] = useState<FennaMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [micLive, setMicLive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micWarning, setMicWarning] = useState<string | null>(null);
  const [ttsWarning, setTtsWarning] = useState<string | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(() => hasWelcomeVideo(identityId));

  const sessionIdRef = useRef<string | null>(null);
  const residentIdRef = useRef("guest");
  const listenerRef = useRef<ContinuousListener | null>(null);
  const messagesRef = useRef<FennaMessage[]>([]);
  const langRef = useRef(lang);
  const identityRef = useRef(identityId);
  const speakingRef = useRef(false);
  const welcomeVideoRef = useRef<HTMLVideoElement>(null);
  const sessionGenRef = useRef(0);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const addressFormRef = useRef<"formeel" | "informeel">("formeel");
  const ttsWarnedRef = useRef(false);
  const turnInFlightRef = useRef(false);

  function recoveryMessage(raw: string): string {
    if (raw.includes("lang") || raw.includes("long") || raw.includes("te lang")) {
      return langRef.current === "en"
        ? "That took a moment — please speak again when you're ready."
        : "Het duurde even — praat gerust nog eens als u wilt.";
    }
    if (raw.includes("verstaan") || raw.includes("understand") || raw.includes("empty")) {
      return langRef.current === "en"
        ? "I didn't catch that — could you say it once more?"
        : "Ik heb u niet goed verstaan — wilt u het nog een keer zeggen?";
    }
    return langRef.current === "en"
      ? "Something went wrong — you can try speaking again."
      : "Er ging iets mis — u kunt het gerust nog eens proberen.";
  }

  function isRecoverableVoiceError(raw: string): boolean {
    return (
      raw !== "SESSION_ENDED" &&
      !raw.toLowerCase().includes("microphone") &&
      !raw.toLowerCase().includes("microfoon")
    );
  }

  useEffect(() => {
    addressFormRef.current =
      profile?.address_form === "informeel" ? "informeel" : "formeel";
  }, [profile?.address_form]);

  useEffect(() => {
    identityRef.current = identityId;
    endCompanionVoiceSession();
    listenerRef.current?.stop();
    listenerRef.current = null;
    sessionIdRef.current = null;
    setWelcomeOpen(hasWelcomeVideo(identityId));
    setPhase("idle");
    setSessionActive(false);
    setMessages([]);
    setError(null);
    setTtsWarning(null);
    ttsWarnedRef.current = false;
    setMicLive(false);
    setRecording(false);
  }, [identityId]);

  const closeWelcome = useCallback(() => {
    welcomeVideoRef.current?.pause();
    setWelcomeOpen(false);
  }, []);

  useEffect(() => {
    if (!welcomeOpen || !welcomeVideoSrc) return;
    void welcomeVideoRef.current?.play().catch(() => {});
  }, [welcomeOpen, welcomeVideoSrc]);

  const addMessage = useCallback((role: FennaMessage["role"], content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${role}-${Date.now()}`, role, content },
    ]);
  }, []);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    messagesRef.current = messages;
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => {
      endCompanionVoiceSession();
      listenerRef.current?.stop();
      listenerRef.current = null;
      const sid = sessionIdRef.current;
      if (sid && !sid.startsWith("guest-")) {
        void hartmaatjeApi.endSession(sid).catch(() => {});
      }
      sessionIdRef.current = null;
    };
  }, []);

  const onUtterance = useCallback(async (blob: Blob) => {
    const sid = sessionIdRef.current;
    const gen = sessionGenRef.current;
    if (!sid || !isCompanionVoiceSessionActive(gen)) return;
    if (turnInFlightRef.current) {
      voiceLog("turn skipped — previous turn still in flight");
      return;
    }

    turnInFlightRef.current = true;
    const turnId = beginVoiceTurn();
    const timings: TurnTimings = { vadEndAt: Date.now() };
    setPhase("thinking");
    setMicLive(false);
    setRecording(false);
    listenerRef.current?.pause();
    setError(null);

    try {
      timings.apiStartAt = Date.now();
      const turn = await processCompanionVoiceTurn(
        blob,
        langRef.current,
        messagesRef.current,
        sid,
        residentIdRef.current,
        identityRef.current,
        addressFormRef.current,
      );
      if (!isCompanionVoiceSessionActive(gen)) return;
      timings.apiEndAt = Date.now();
      markSttCompleted(turnId, turn.userText);
      markBackendCompleted(turnId, turn.timings_ms);
      voiceLog("reply ready — starting TTS on client", {
        chars: turn.reply.length,
        timings_ms: turn.timings_ms,
        metrics: snapshotVoiceMetrics().counters,
      });

      if (!turn.userText?.trim()) {
        const msg = recoveryMessage("empty");
        setTtsWarning(msg);
        recoverVoiceTurn(turnId);
        return;
      }

      if (!turn.reply?.trim()) {
        const msg = recoveryMessage("Geen antwoord");
        setTtsWarning(msg);
        recoverVoiceTurn(turnId);
        return;
      }

      setPhase("speaking");
      speakingRef.current = true;
      timings.playbackStartAt = Date.now();
      logTurnTimings("voice turn", timings);

      if (turn.userText) addMessage("user", turn.userText);
      if (!isApiErrorPayload(turn.reply)) {
        addMessage("assistant", turn.reply);
      }

      try {
        if (turn.replyAudioBase64) {
          await playFennaAudio(
            turn.replyAudioBase64,
            turn.replyMimeType ?? "audio/mp3",
            getGeminiPlaybackRate(identityRef.current),
            () => isCompanionVoiceSessionActive(gen),
          );
        } else {
          await playCompanionReply(
            turn.reply,
            langRef.current,
            identityRef.current,
            gen,
            sid,
          );
        }
      } catch (ttsErr) {
        if (isTtsQuotaFailure(ttsErr) && !ttsWarnedRef.current) {
          ttsWarnedRef.current = true;
          setTtsWarning(getTtsErrorMessage(ttsErr));
        } else if (!isTtsQuotaFailure(ttsErr)) {
          throw ttsErr;
        }
      }
      completeVoiceTurn(turnId);
    } catch (err) {
      if (!isCompanionVoiceSessionActive(gen)) return;
      if (err instanceof Error && err.name === "AbortError") return;
      speakingRef.current = false;
      const raw = err instanceof Error ? err.message : app.errors.speechServiceFailed;
      if (raw === "SESSION_ENDED") return;
      if (isRecoverableVoiceError(raw)) {
        setTtsWarning(
          err instanceof CompanionApiError
            ? getTtsErrorMessage(err)
            : recoveryMessage(raw),
        );
        recoverVoiceTurn(turnId);
        return;
      }
      failVoiceTurn(turnId, raw);
      setError(
        err instanceof CompanionApiError
          ? getTtsErrorMessage(err)
          : friendlyGeminiErrorMessage(raw, langRef.current, displayName),
      );
      setPhase("error");
    } finally {
      turnInFlightRef.current = false;
      if (isCompanionVoiceSessionActive(gen) && sessionIdRef.current) {
        speakingRef.current = false;
        listenerRef.current?.resume();
        setPhase((p) => (p === "error" ? "error" : "listening"));
        setMicLive(true);
      }
    }
  }, [addMessage, app.errors.speechServiceFailed, displayName]);

  const startSession = useCallback(async () => {
    setError(null);
    setTtsWarning(null);
    ttsWarnedRef.current = false;
    setMicWarning(null);
    setMicLevel(0);
    setMessages([]);
    setPhase("starting");
    voiceLog("session start (one tap — microphone stays on)", {
      identityId: identityRef.current,
    });

    try {
      await unlockAudioPlayback();

      let sessionId: string | null = null;
      try {
        const health = await hartmaatjeApi.health();
        if (health.fenna_ready) {
          const residentId =
            typeof window !== "undefined"
              ? localStorage.getItem(RESIDENT_KEY) ?? "guest"
              : "guest";
          const res = await hartmaatjeApi.startSession(
            residentId,
            lang,
            identityRef.current,
          );
          sessionId = res.session_id;
          storeBackendSessionId(sessionId);
          voiceLog("backend session", { sessionId });
        }
      } catch {
        voiceLog("backend unavailable — using Next.js voice pipeline");
      }

      sessionIdRef.current = sessionId ?? `guest-${Date.now()}`;
      residentIdRef.current =
        typeof window !== "undefined"
          ? localStorage.getItem(RESIDENT_KEY) ?? "guest"
          : "guest";
      const gen = beginCompanionVoiceSession();
      sessionGenRef.current = gen;
      exposeVoiceMetricsGlobally();
      setSessionActive(true);

      const opening = getCompanionOpening(identityRef.current, lang);
      addMessage("assistant", opening);
      logVoiceTranscriptLine({
        identityId: identityRef.current,
        lang,
        role: "assistant",
        text: opening,
        sessionId: sessionIdRef.current,
      });

      const listener = new ContinuousListener({
        lang,
        onUtterance,
        onListeningChange: setMicLive,
        onRecordingChange: (rec) => {
          setRecording(rec);
          if (rec && (speakingRef.current || isFennaAudioPlaying())) {
            interruptFennaAudio("user recording");
            speakingRef.current = false;
          }
        },
        onMicLevel: setMicLevel,
        onMicNoSignal: () => {
          setMicWarning(
            lang === "en"
              ? "I hear no sound from your microphone yet. In Windows → Sound → Input, test your microphone — the bar should move when you speak."
              : "Ik hoor nog geen geluid van uw microfoon. Ga in Windows → Geluid → Ingang naar ‘Uw microfoon testen’ — de balk moet bewegen als u praat.",
          );
        },
      });
      listenerRef.current = listener;
      await listener.start();

      setPhase("speaking");
      setMicLive(false);
      listener.pause();
      speakingRef.current = true;
      try {
        await speakCompanionLine(opening, lang, identityRef.current, gen, sessionIdRef.current);
      } catch (ttsErr) {
        if (isTtsQuotaFailure(ttsErr) && !ttsWarnedRef.current) {
          ttsWarnedRef.current = true;
          setTtsWarning(getTtsErrorMessage(ttsErr));
        } else if (!isTtsQuotaFailure(ttsErr)) {
          throw ttsErr;
        }
      }
      if (!isCompanionVoiceSessionActive(gen)) return;
      speakingRef.current = false;

      listener.resume();
      setPhase("listening");
      setMicLive(true);
    } catch (err) {
      listenerRef.current?.stop();
      listenerRef.current = null;
      const message =
        err instanceof MicAccessError
          ? err.message
          : err instanceof Error
            ? err.message
            : lang === "en"
              ? "Could not start."
              : "Kan niet starten.";
      setError(message);
      setPhase("error");
      setSessionActive(false);
      sessionIdRef.current = null;
    }
  }, [addMessage, displayName, lang, onUtterance]);

  const endSession = useCallback(() => {
    endCompanionVoiceSession();
    speakingRef.current = false;
    listenerRef.current?.stop();
    listenerRef.current = null;
    const sid = sessionIdRef.current;
    if (sid && !sid.startsWith("guest-")) {
      void hartmaatjeApi.endSession(sid).catch(() => {});
    }
    sessionIdRef.current = null;
    sessionGenRef.current = 0;
    setSessionActive(false);
    setMicLive(false);
    setRecording(false);
    setMicLevel(0);
    setMicWarning(null);
    setMessages([]);
    setPhase("idle");
    setError(null);
    setTtsWarning(null);
    ttsWarnedRef.current = false;
    voiceLog("session ended");
  }, []);

  const statusText =
    phase === "starting"
      ? lang === "en"
        ? "Starting…"
        : "Bezig met starten…"
      : phase === "listening"
        ? recording
          ? lang === "en"
            ? "I'm listening…"
            : "Ik luister naar u…"
          : lang === "en"
            ? "Speak whenever you like — I'm listening"
            : "Praat gerust — ik luister"
        : phase === "thinking"
          ? lang === "en"
            ? `${displayName} is thinking…`
            : `${displayName} denkt na…`
          : phase === "speaking"
            ? lang === "en"
              ? `${displayName} is speaking…`
              : `${displayName} spreekt…`
            : phase === "error"
              ? error ?? copy.statusIdle
              : copy.statusIdle;

  const startLabel =
    phase === "starting"
      ? lang === "en"
        ? "Starting…"
        : "Bezig…"
      : lang === "en"
        ? `Start chat with ${displayName}`
        : `Start gesprek met ${displayName}`;

  if (welcomeOpen && welcomeVideoSrc) {
    return (
      <div className={`flex flex-col overflow-hidden rounded-3xl border border-[#f8f2e8]/70 ${companionShellClass} shadow-[0_18px_44px_rgba(44,36,22,0.2)]`}>
        <div className="flex shrink-0 flex-col gap-3 border-b border-[#eef3ea]/25 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-center sm:text-left">
            <p className="text-xl font-bold text-white sm:text-2xl">{displayName}</p>
            <p className="mt-1 text-base font-medium leading-snug text-[#eef3ea] sm:text-lg">
              {copy.liveWelcomeHint}
            </p>
          </div>
          <button
            type="button"
            onClick={closeWelcome}
            className={`w-full shrink-0 px-4 py-3 text-base font-semibold sm:w-auto ${companionStartButtonClass}`}
          >
            {copy.liveWelcomeContinue}
          </button>
        </div>
        <div className={`flex min-h-[36vh] max-h-[58vh] items-center justify-center ${companionMediaBackdropClass}`}>
          <WelcomeVideoFrame className="h-full w-full max-h-[58vh]">
            <video
              ref={welcomeVideoRef}
              src={welcomeVideoSrc}
              className="max-h-[58vh] w-full object-contain"
              playsInline
              autoPlay
              onEnded={closeWelcome}
            />
          </WelcomeVideoFrame>
        </div>
        <p className="shrink-0 px-4 py-3 text-center text-lg font-semibold text-white/90">
          {displayName}
        </p>
      </div>
    );
  }

  const portraitPanel = (
    <div className="shrink-0 overflow-hidden border-b border-[#e8dfd0]/55">
      <div
        className={`relative flex w-full items-center justify-center ${companionMediaBackdropClass} ${
          sessionActive ? "h-16 sm:h-20" : "h-28 sm:h-32"
        } ${
          phase === "speaking" ? "ring-2 ring-inset ring-[#5aabaa]/40" : ""
        } ${phase === "listening" && micLive ? "ring-2 ring-inset ring-[#c45c3e]/25" : ""}`}
      >
        <AvatarPortrait
          identityId={identityId}
          displayName={displayName}
          size={sessionActive ? "sm" : "md"}
          className="border-2 border-white shadow-md"
        />
      </div>
      {!sessionActive ? (
        <p className="bg-[#faf6f0] px-3 py-1 text-center text-base font-bold text-[#2c4a22]">
          {displayName}
        </p>
      ) : null}
    </div>
  );

  const cardShellClass =
    "flex max-h-[calc(100dvh-4.5rem)] flex-col rounded-2xl border border-[#f8f2e8]/70 bg-[#faf6f0]/95 shadow-[0_12px_32px_rgba(44,36,22,0.18)] backdrop-blur-md sm:max-h-[calc(100dvh-4rem)]";

  const activeFooter = (
    <div className="shrink-0 border-t border-[#e8dfd0]/55 bg-[#faf6f0] px-3 py-2">
      {ttsWarning ? (
        <p
          role="status"
          className="mb-2 rounded-xl border border-[#d8a574] bg-[#fff8ee] px-3 py-2 text-sm text-[#6b4a2a]"
        >
          {ttsWarning}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mb-2 rounded-xl border border-[#d8a574] bg-[#fff8ee] px-3 py-2 text-sm text-[#6b4a2a]"
        >
          {error}
        </p>
      ) : null}
      <div className="space-y-2">
        <div
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
            micLive
              ? "border-[#c45c3e]/40 bg-[#fff5ee]/60"
              : "border-[#5aabaa]/40 bg-[#eef8f7]/60"
          }`}
        >
          <MicGlyph
            className={`h-6 w-6 shrink-0 ${micLive ? "text-[#c45c3e]" : "text-[#2d5a55]"}`}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#5c4a32]">
              {micLive
                ? recording
                  ? lang === "en"
                    ? "Listening…"
                    : "Ik luister…"
                  : lang === "en"
                    ? "Mic on — speak anytime"
                    : "Microfoon aan"
                : lang === "en"
                  ? "Please wait…"
                  : "Even wachten…"}
            </p>
            {micLive ? (
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#e8dfd0]">
                <div
                  className="h-full rounded-full bg-[#05381F] transition-[width] duration-75"
                  style={{ width: `${Math.min(100, Math.round(micLevel * 4))}%` }}
                />
              </div>
            ) : null}
          </div>
        </div>
        {micWarning ? (
          <p
            role="alert"
            className="rounded-lg border border-[#d8a574] bg-[#fff8ee] px-2 py-1.5 text-xs text-[#6b4a2a]"
          >
            {micWarning}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => endSession()}
            className="rounded-xl border border-[#8a7a66] bg-white px-3 py-2 text-sm font-semibold"
          >
            {lang === "en" ? "End conversation" : "Gesprek beëindigen"}
          </button>
          {onBack ? (
            <button
              type="button"
              onClick={() => {
                endSession();
                onBack();
              }}
              className="rounded-xl border border-[#d8ccb8] bg-[#f5f0e8] px-3 py-2 text-sm font-semibold text-[#5c4a32]"
            >
              {lang === "en" ? "← Other maatje" : "← Ander maatje"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  const startFooter = (
    <div className="shrink-0 border-t border-[#e8dfd0]/55 bg-[#faf6f0] px-4 py-3">
      <button
        type="button"
        onClick={() => void startSession()}
        disabled={phase === "starting"}
        className={`w-full ${companionStartButtonClass} px-6 py-4 text-xl`}
      >
        {startLabel}
      </button>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mt-3 w-full rounded-2xl border-2 border-[#8a7a66] bg-white px-4 py-3 text-lg font-semibold text-[#5c4a32]"
        >
          {lang === "en" ? "← Choose another companion" : "← Kies ander maatje"}
        </button>
      ) : null}
    </div>
  );

  if (!sessionActive) {
    return (
      <div className={cardShellClass}>
        <div
          role="status"
          aria-live="polite"
          className="shrink-0 border-b border-[#e8dfd0]/55 bg-[#f5f0e8]/80 px-5 py-2.5 text-center text-lg font-semibold text-[#4a6741] sm:text-xl"
        >
          {statusText}
        </div>
        {portraitPanel}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="px-5 py-2.5 text-center text-lg leading-snug text-[#5c4a32] sm:text-xl">
            {copy.voiceInstruction}
          </p>
          {error ? (
            <p
              role="alert"
              className="mx-5 mb-2 rounded-2xl border border-[#d8a574] bg-[#fff8ee] px-4 py-3 text-lg text-[#6b4a2a]"
            >
              {error}
            </p>
          ) : null}
        </div>
        {startFooter}
      </div>
    );
  }

  return (
    <div className={cardShellClass}>
      <div
        role="status"
        aria-live="polite"
        className={`shrink-0 border-b border-[#e8dfd0]/55 px-3 py-1.5 text-center text-sm font-semibold ${
          phase === "listening"
            ? "bg-[#fff5ee] text-[#8b4a2a]"
            : phase === "thinking" || phase === "speaking" || phase === "starting"
              ? "bg-[#eef8f7] text-[#2d5a55]"
              : "bg-[#f5f0e8]/80 text-[#4a6741]"
        }`}
      >
        {statusText}
      </div>

      {portraitPanel}

      <div
        ref={transcriptRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-2"
      >
        {messages.length > 0 ? (
          <div className="space-y-2">
            {messages.map((m) => (
              <div key={m.id}>
                <p className="text-xs font-medium text-[#8a7a66]">
                  {m.role === "user" ? app.chat.userSaidLabel : displayName}
                </p>
                <p className="mt-0.5 rounded-xl bg-white px-3 py-2 text-sm leading-relaxed text-[#2c2416]">
                  {m.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-2 text-center text-sm text-[#8a7a66]">
            {lang === "en"
              ? "Your conversation appears here."
              : "Uw gesprek verschijnt hier."}
          </p>
        )}
      </div>

      {activeFooter}
    </div>
  );
}

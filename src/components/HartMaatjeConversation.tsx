"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useHomeCompanion } from "@/context/HomeCompanionContext";
import { useLanguage } from "@/context/LanguageContext";
import { CompanionPanel } from "@/components/CompanionPanel";
import { HomeCharacterPortraits } from "@/components/HomeCharacterPortraits";
import { LightGreenBadge, MicGlyph, hartmaatjeGreenButtonClass, hartmaatjeMicButtonClass } from "@/components/ui";
import { usePickVoice } from "@/components/usePickVoice";
import { VoiceIdentityPicker } from "@/components/VoiceIdentityPicker";
import {
  getVoiceIdentity,
  rememberLastAssistantReply,
  repeatLastSpoken,
  resolveVoiceSettings,
  speakHartMaatje,
  stopHartMaatjeSpeech,
  loadLocalVoiceSettings,
  type VoiceIdentityId,
} from "@/lib/voice";
import { getSupabase, getAuthSession, withSupabaseTimeout } from "@/lib/supabase";
import { sendChatMessage } from "@/lib/sendChat";
import {
  loadGuestMessages,
  saveGuestMessages,
  type GuestMessage,
} from "@/lib/guestChat";
import { transcribeAudioBlob, isVoiceTypingFallback } from "@/lib/transcribeAudio";
import {
  isBrowserSpeechInputSupported,
  listenWithBrowserSpeech,
  stopBrowserSpeechInput,
} from "@/lib/browserSpeechInput";
import { translateApiError } from "@/lib/appLocale";
import { hasWelcomeVideo } from "@/lib/avatars";
import {
  fennaNatureErrorReply,
  fennaNatureReply,
  fennaReturnReply,
  fetchNatureScene,
  isNatureShowRequest,
  isReturnToCompanionRequest,
} from "@/lib/natureShowcase";

type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type HartMaatjeConversationProps = {
  initialIdentityId?: VoiceIdentityId;
  onBack?: () => void;
};

export function HartMaatjeConversation({
  initialIdentityId,
  onBack,
}: HartMaatjeConversationProps = {}) {
  const { profile } = useAuth();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [items, setItems] = useState<ConversationMessage[]>([]);
  const [composer, setComposer] = useState("");
  const [loadingThread, setLoadingThread] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [showTypingOption, setShowTypingOption] = useState(false);
  const [typingFallbackHint, setTypingFallbackHint] = useState<string | null>(
    null,
  );

  const {
    companionPhase,
    welcomePlayNonce,
    natureScene,
    startWelcome,
    completeWelcome,
    closeCompanion,
    showNatureScene,
    hideNatureScene,
  } = useHomeCompanion();
  const listEndRef = useRef<HTMLDivElement>(null);
  const speechRecRef = useRef<ReturnType<typeof listenWithBrowserSpeech>>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onSendRef = useRef<(text?: string) => void>(() => {});

  const { copy, app, lang } = useLanguage();

  const greeting = useMemo(() => {
    const n = profile?.display_name?.trim();
    if (n) return copy.greetingNamed(n);
    return copy.greetingDefault;
  }, [copy, profile?.display_name]);

  const showMicCue = Boolean(composer.trim()) && !busy && !transcribing;

  const reloadMessages = useCallback(async (tid: string | null) => {
    const client = getSupabase();
    if (!client || !tid) return;
    const res = await client
      .from("conversation_messages")
      .select("id,role,content")
      .eq("thread_id", tid)
      .order("created_at", { ascending: true });
    if (!res.error && res.data) setItems(res.data as ConversationMessage[]);
  }, []);

  useEffect(() => {
    let cancel = false;
    const init = async () => {
      try {
        const client = getSupabase();
        if (!client) {
          if (!cancel) setItems(loadGuestMessages());
          return;
        }
        const session = await getAuthSession(client);
        if (!session) {
          if (!cancel) setItems(loadGuestMessages());
          return;
        }
        if (!cancel) setLoadingThread(true);
        const thr = await withSupabaseTimeout(
          client
            .from("conversation_threads")
            .select("id")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          4000,
        );
        if (cancel || !thr || thr.error || !thr.data?.id) return;
        setThreadId(thr.data.id);
        await reloadMessages(thr.data.id);
      } finally {
        if (!cancel) setLoadingThread(false);
      }
    };
    void init();
    return () => {
      cancel = true;
    };
  }, [reloadMessages]);

  useEffect(() => {
    const t = setTimeout(
      () => listEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      80,
    );
    return () => clearTimeout(t);
  }, [items.length]);

  const [voiceIdentityId, setVoiceIdentityId] = useState<VoiceIdentityId | null>(
    initialIdentityId ?? null,
  );

  useEffect(() => {
    if (initialIdentityId) return;
    const settings = profile
      ? resolveVoiceSettings(profile)
      : (loadLocalVoiceSettings() ?? resolveVoiceSettings(null));
    setVoiceIdentityId(settings.identityId);
  }, [initialIdentityId, profile, profile?.tts_preset_id, profile?.tts_playback_rate]);

  useEffect(() => {
    if (!initialIdentityId) return;
    setVoiceIdentityId(initialIdentityId);
    startWelcome(hasWelcomeVideo(initialIdentityId));
  }, [initialIdentityId, startWelcome]);

  const startCompanionWelcome = useCallback(
    (id: VoiceIdentityId) => {
      startWelcome(hasWelcomeVideo(id));
    },
    [startWelcome],
  );

  const handleVoiceChange = useCallback((id: VoiceIdentityId) => {
    setVoiceIdentityId(id);
  }, []);

  const interactionLocked =
    busy || transcribing || (loadingThread && items.length > 0);

  const pickVoice = usePickVoice(handleVoiceChange, interactionLocked);

  const activeCharacter = useMemo(
    () => (voiceIdentityId ? getVoiceIdentity(voiceIdentityId) : null),
    [voiceIdentityId],
  );

  const statusLabel = useMemo(() => {
    if (loadingThread && items.length > 0) return copy.statusLoading;
    if (recording) return copy.statusRecording;
    if (transcribing) return copy.statusTranscribing;
    if (busy) return copy.statusBusy;
    if (composer.trim()) return copy.statusConfirm;
    return copy.statusIdle;
  }, [
    loadingThread,
    items.length,
    recording,
    transcribing,
    busy,
    composer,
    copy,
  ]);

  const voiceSettings = useMemo(() => {
    const base = resolveVoiceSettings(profile);
    return voiceIdentityId
      ? { ...base, identityId: voiceIdentityId }
      : base;
  }, [
    profile,
    voiceIdentityId,
  ]);

  const lastAssistantText = useMemo(
    () =>
      [...items].reverse().find((m) => m.role === "assistant")?.content ?? null,
    [items],
  );

  useEffect(() => {
    if (lastAssistantText) {
      rememberLastAssistantReply(lastAssistantText, voiceSettings);
    }
  }, [lastAssistantText, voiceSettings]);

  const replayLast = () => {
    repeatLastSpoken(voiceSettings);
  };

  const fennaVoiceSettings = useMemo(
    () => ({ ...voiceSettings, identityId: "fenna" as const }),
    [voiceSettings],
  );

  const speakReply = useCallback(
    (replyText: string, identityId = voiceSettings.identityId) => {
      const settings =
        identityId === "fenna"
          ? fennaVoiceSettings
          : { ...voiceSettings, identityId };
      rememberLastAssistantReply(replyText, settings);
      speakHartMaatje(replyText, settings, lang);
    },
    [fennaVoiceSettings, voiceSettings, lang],
  );

  const appendFennaExchange = useCallback(
    (userText: string, replyText: string) => {
      const userMsg: ConversationMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: userText,
      };
      const aiMsg: ConversationMessage = {
        id: `a-${Date.now() + 1}`,
        role: "assistant",
        content: replyText,
      };
      setItems((prev) => {
        const next = [...prev, userMsg, aiMsg];
        if (!profile) saveGuestMessages(next);
        return next;
      });
      if (!profile) setThreadId("local");
      speakReply(replyText, "fenna");
    },
    [profile, speakReply],
  );

  const handleBackFromNature = useCallback(() => {
    hideNatureScene();
    speakReply(fennaReturnReply(lang), "fenna");
  }, [hideNatureScene, lang, speakReply]);

  const handleCloseCompanion = useCallback(() => {
    stopHartMaatjeSpeech();
    if (onBack) {
      onBack();
      return;
    }
    closeCompanion();
  }, [closeCompanion, onBack]);

  const onSend = async (spokenText?: string) => {
    const text = (spokenText ?? composer).trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    const prevComposer = composer;
    if (!spokenText) setComposer("");

    if (voiceIdentityId === "fenna") {
      if (natureScene && isReturnToCompanionRequest(text, "fenna")) {
        hideNatureScene();
        appendFennaExchange(text, fennaReturnReply(lang));
        setBusy(false);
        return;
      }

      if (isNatureShowRequest(text)) {
        const scene = await fetchNatureScene(lang);
        if (scene) {
          showNatureScene(scene);
          appendFennaExchange(text, fennaNatureReply(lang));
        } else {
          appendFennaExchange(text, fennaNatureErrorReply(lang));
        }
        setBusy(false);
        return;
      }
    }

    const prevId = threadId;
    const history = items.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const outcome = await sendChatMessage(prevId, text, lang, {
      identityId: voiceIdentityId ?? "fenna",
      history,
    });

    if (
      outcome.data?.prompt_version === "guest" ||
      outcome.data?.prompt_version === "guest-gemini" ||
      outcome.data?.thread_id === "local"
    ) {
      const userMsg: GuestMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
      };
      const aiMsg: GuestMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: outcome.data.reply,
      };
      setItems((prev) => {
        const next = [...prev, userMsg, aiMsg];
        saveGuestMessages(next);
        return next;
      });
      setThreadId("local");
      speakReply(outcome.data.reply, voiceIdentityId ?? "fenna");
      setBusy(false);
      return;
    }

    if (outcome.data?.thread_id) setThreadId(outcome.data.thread_id);
    await reloadMessages(outcome.data?.thread_id ?? prevId ?? null);
    const latestReply = outcome.data?.reply;
    if (latestReply) {
      speakReply(latestReply, voiceIdentityId ?? "fenna");
    }
    setBusy(false);

    if (outcome.error) {
      setComposer(prevComposer);
      setError(translateApiError(outcome.error, lang));
    }
  };

  onSendRef.current = (text?: string) => {
    void onSend(text);
  };

  const toggleMic = async () => {
    setError(null);
    if (transcribing || busy) return;

    if (speechRecRef.current) {
      stopBrowserSpeechInput(speechRecRef.current);
      speechRecRef.current = null;
      setRecording(false);
      return;
    }

    if (recorderRef.current && recording) {
      recorderRef.current.stop();
      return;
    }

    if (isBrowserSpeechInputSupported()) {
      setRecording(true);
      speechRecRef.current = listenWithBrowserSpeech(
        lang,
        (transcript) => {
          speechRecRef.current = null;
          setRecording(false);
          if (!transcript.trim()) {
            setError(app.errors.notHeardWell);
            return;
          }
          onSendRef.current(transcript);
        },
        () => {
          speechRecRef.current = null;
          setRecording(false);
        },
      );
      if (!speechRecRef.current) {
        setRecording(false);
        setError(app.errors.micNotSupported);
      }
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(app.errors.micNotSupported);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        recorderRef.current = null;
        if (!blob.size) return;
        setTranscribing(true);
        const out = await transcribeAudioBlob(blob, lang);
        setTranscribing(false);
        if (out.error) {
          if (isVoiceTypingFallback(out.error)) {
            setTypingFallbackHint(out.error);
            setShowTypingOption(true);
            return;
          }
          setError(translateApiError(out.error, lang));
          return;
        }
        const spoken = out.text ?? "";
        if (!spoken) {
          setError(app.errors.notHeardWell);
          return;
        }
        onSendRef.current(spoken);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError(app.errors.micPermissionDenied);
    }
  };


  const isWelcomeHome =
    !initialIdentityId && items.length === 0 && companionPhase === "idle";
  const inVoiceChat =
    Boolean(initialIdentityId) ||
    companionPhase !== "idle" ||
    items.length > 0;

  const micButton = (
    <button
      type="button"
      aria-label={recording ? app.chat.micListeningAria : app.chat.micStartAria}
      onClick={() => void toggleMic()}
      disabled={interactionLocked}
      className={`flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center rounded-full border-[6px] shadow-[0_10px_24px_rgba(44,36,22,0.24)] transition hover:scale-[1.05] hover:shadow-[0_12px_28px_rgba(44,36,22,0.26)] active:scale-[0.96] active:shadow-[0_6px_16px_rgba(44,36,22,0.22)] disabled:opacity-50 disabled:hover:scale-100 sm:h-[6.5rem] sm:w-[6.5rem] ${
        recording
          ? "border-red-500 bg-gradient-to-br from-red-500 to-red-600"
          : hartmaatjeMicButtonClass
      }`}
    >
      <span className="flex h-[3.45rem] w-[3.45rem] items-center justify-center rounded-full border-[3px] border-white bg-white text-[#4a6741] sm:h-16 sm:w-16">
        {transcribing ? (
          <span className="text-2xl font-medium" aria-hidden="true">
            …
          </span>
        ) : (
          <MicGlyph
            className={`h-8 w-8 sm:h-9 sm:w-9 ${
              recording ? "text-red-600" : "text-[#4a6741]"
            }`}
          />
        )}
      </span>
    </button>
  );

  const welcomeText = (
    <>
      <p className="text-2xl font-semibold leading-snug text-[#4a6741] sm:text-[1.9rem]">
        {copy.welcomeLine1}
      </p>
      <p className="text-2xl font-semibold leading-snug text-[#4a6741] sm:text-[1.9rem]">
        {greeting}
      </p>
      <p className="text-2xl font-semibold leading-snug text-[#4a6741] sm:text-[1.9rem]">
        {copy.welcomeLine2}
      </p>
    </>
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-[#f8f2e8]/70 bg-[#faf6f0]/95 shadow-[0_18px_44px_rgba(44,36,22,0.2)] backdrop-blur-md">
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center justify-center gap-3 border-b border-[#e8dfd0]/55 px-5 py-3.5 text-center text-2xl font-semibold sm:text-[1.8rem] ${
          recording
            ? "bg-[#fff5ee] text-[#8b4a2a]"
            : busy || transcribing
              ? "bg-[#eef8f7] text-[#2d5a55]"
              : "bg-[#f5f0e8]/80 text-[#4a6741]"
        }`}
      >
        {!(
          loadingThread && items.length > 0
        ) && (
          <span
            className={`hm-pulse-dot h-3 w-3 shrink-0 rounded-full ${
              recording
                ? "bg-[#c45c3e]"
                : busy || transcribing
                  ? "bg-[#5aabaa]"
                  : "bg-[#4a6741]"
            }`}
            aria-hidden="true"
          />
        )}
        {statusLabel}
      </div>

      {voiceIdentityId && companionPhase !== "idle" ? (
        <div className="border-b border-[#e8dfd0]/55 px-4 py-3 sm:px-5 sm:py-4">
          <CompanionPanel
            identityId={voiceIdentityId}
            phase={companionPhase === "welcoming" ? "welcoming" : "present"}
            playNonce={welcomePlayNonce}
            natureScene={natureScene}
            onWelcomeComplete={completeWelcome}
            onClose={handleCloseCompanion}
            onBackFromNature={handleBackFromNature}
          />
        </div>
      ) : null}

      {isWelcomeHome ? (
        <div className="space-y-2.5 border-b border-[#e8dfd0]/55 px-4 py-3 sm:px-5 sm:py-4">
          {companionPhase === "idle" ? (
            <p className="text-center text-2xl font-extrabold text-[#2c4a22] sm:text-[2rem]">
              {copy.chooseVoice}
            </p>
          ) : (
            <p className="text-center text-lg font-medium text-[#8a7a66] sm:text-xl">
              {copy.chooseVoice}
            </p>
          )}
          <HomeCharacterPortraits
            selectedId={voiceIdentityId}
            disabled={interactionLocked}
            onPick={(id) => {
              if (id !== voiceIdentityId || companionPhase === "idle") {
                startCompanionWelcome(id);
              }
              void pickVoice(id);
            }}
          />
          <div className="flex justify-center pt-0.5">
            <LightGreenBadge>{copy.voiceInstruction}</LightGreenBadge>
          </div>
          <div className="flex justify-center pt-1">{micButton}</div>
          <div className="space-y-1.5 pt-1 text-center">{welcomeText}</div>
        </div>
      ) : null}

      {!isWelcomeHome ? (
      <div
        className={`overflow-y-auto px-5 pb-5 pt-4 sm:px-6 ${
          items.length === 0
            ? "flex-none space-y-3 py-4"
            : "flex-1 space-y-6"
        }`}
      >
        {items.length === 0 && inVoiceChat ? (
          <p className="py-2 text-center text-xl text-[#5c4a32] sm:text-2xl">
            {copy.voiceInstruction}
          </p>
        ) : null}
        {loadingThread && items.length === 0 ? (
          <p className="py-4 text-center text-2xl text-[#5c4a32]">
            {copy.statusLoading}
          </p>
        ) : (
          items.map((m) => (
            <div key={m.id} className="space-y-2">
              <p className="text-lg font-medium text-[#8a7a66] sm:text-xl">
                {m.role === "user"
                  ? app.chat.userSaidLabel
                  : (activeCharacter?.displayName ?? app.chat.brandFallback)}
              </p>
              <div
                className={`rounded-3xl px-5 py-4 text-2xl leading-relaxed sm:text-[1.65rem] ${
                  m.role === "user"
                    ? "border border-[#e8dfd0]/60 bg-[#faf6f0]/80 text-[#5c4a32]"
                    : "border border-[#e8dfd0]/80 bg-gradient-to-br from-[#fffdf9] to-[#faf6f0] text-[#2c2416] shadow-sm shadow-[#e8936a]/10"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        <div ref={listEndRef} />
      </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mx-5 mb-3 rounded-2xl border border-[#d8a574] bg-[#fff8ee] px-5 py-4 text-xl text-[#6b4a2a] sm:text-2xl"
        >
          {error}
        </p>
      ) : null}

      <div
        className={`px-4 sm:px-5 ${
          isWelcomeHome
            ? "border-t border-[#e8dfd0]/40 pb-4 pt-2"
            : "border-t border-[#e8dfd0]/55 pb-5 pt-3"
        }`}
      >
        {composer.trim() ? (
          <div className="mb-4 rounded-2xl border border-[#d8ccb8] bg-[#f5f0e8] px-4 py-3 text-center">
            <p className="mb-1 text-lg text-[#8a7a66] sm:text-xl">{app.chat.heardYouSay}</p>
            <p className="text-xl leading-relaxed text-[#2c2416] sm:text-2xl">
              &ldquo;{composer.trim()}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => void onSend()}
              disabled={interactionLocked}
              className={`mt-3 w-full px-6 py-4 text-2xl font-semibold ${hartmaatjeGreenButtonClass} disabled:opacity-50`}
            >
              {busy ? app.common.loading : app.chat.confirmSend}
            </button>
          </div>
        ) : null}

        {!isWelcomeHome ? (
        <div className="flex flex-col items-center gap-2">
          {showMicCue ? (
            <p className="text-center text-xl font-medium text-[#5c4a32] sm:text-2xl">
              {app.chat.retryMicCue}
            </p>
          ) : null}
          <VoiceIdentityPicker mic={micButton} />
        </div>
        ) : inVoiceChat ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <VoiceIdentityPicker mic={micButton} />
        </div>
        ) : null}

        <div className={`flex justify-center ${isWelcomeHome ? "mt-2" : "mt-5"}`}>
          <LightGreenBadge
            disabled={!lastAssistantText}
            onClick={() => {
              stopHartMaatjeSpeech();
              replayLast();
            }}
          >
            🔊 {copy.replayLast}
          </LightGreenBadge>
        </div>
        {!lastAssistantText ? (
          <p className="mt-2 text-center text-base text-[#7a6a54] sm:text-lg">
            {app.chat.replayHint}
          </p>
        ) : null}

        {!showTypingOption ? (
          <div className="mt-3 space-y-2 text-center">
            {onBack ? (
              <button
                type="button"
                onClick={handleCloseCompanion}
                className="w-full rounded-2xl border-2 border-[#8a7a66] bg-white px-4 py-3 text-lg font-semibold text-[#5c4a32]"
              >
                {lang === "en" ? "← Choose another companion" : "← Kies ander maatje"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setTypingFallbackHint(null);
                setShowTypingOption(true);
              }}
              className="text-lg text-[#8a7a66] hover:text-[#5c4a32] sm:text-xl"
            >
              {app.chat.preferTyping}
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-[#d8ccb8]/80 bg-white/60 p-4">
            <p className="mb-2 text-center text-lg text-[#8a7a66] sm:text-xl">
              {typingFallbackHint ?? app.chat.typingFallbackDefault}
            </p>
            <textarea
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              placeholder={app.chat.composerPlaceholder}
              rows={2}
              disabled={interactionLocked}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void onSend();
                }
              }}
              className="max-h-32 w-full resize-none rounded-2xl border-2 border-[#d8ccb8]/80 bg-white px-4 py-3.5 text-xl text-[#2c2416] focus:border-[#5aabaa] focus:outline-none focus:ring-2 focus:ring-[#5aabaa]/30 sm:text-2xl"
            />
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void onSend()}
                disabled={interactionLocked || !composer.trim()}
                className={`px-6 py-3.5 text-xl font-semibold sm:text-2xl ${hartmaatjeGreenButtonClass} disabled:opacity-50`}
              >
                {app.chat.sendButton}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTypingOption(false);
                  setTypingFallbackHint(null);
                  setComposer("");
                }}
                className="rounded-2xl border border-[#d8ccb8] bg-white px-6 py-3.5 text-xl text-[#5c4a32] sm:text-2xl"
              >
                {app.chat.closeButton}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

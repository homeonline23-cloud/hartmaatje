"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AvatarPortrait } from "@/components/AvatarPortrait";
import { MicGlyph, hartmaatjeGreenButtonClass, hartmaatjeGreenSurfaceClass, hartmaatjeMicButtonClass } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import {
  loadFennaMessages,
  saveFennaMessages,
  sendFennaMessage,
  type FennaMessage,
} from "@/lib/fennaChat";
import { transcribeAudioBlob } from "@/lib/transcribeAudio";
import {
  rememberLastAssistantReply,
  speakHartMaatjeAndWait,
  stopHartMaatjeSpeech,
} from "@/lib/voice";

const FENNA_VOICE = { identityId: "fenna" as const, playbackRate: 0.92 };

export function FennaChatbox() {
  const { copy, app, lang } = useLanguage();
  const [messages, setMessages] = useState<FennaMessage[]>([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [showType, setShowType] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<FennaMessage[]>([]);

  useEffect(() => {
    setMessages(loadFennaMessages());
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, busy, transcribing]);

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state !== "inactive") {
        try {
          recorderRef.current?.stop();
        } catch {
          /* ignore */
        }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    } else {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setRecording(false);
    }
  }, []);

  const speakFenna = useCallback(
    async (text: string) => {
      rememberLastAssistantReply(text, FENNA_VOICE);
      setSpeaking(true);
      try {
        await speakHartMaatjeAndWait(text, FENNA_VOICE, lang);
      } finally {
        setSpeaking(false);
      }
    },
    [lang],
  );

  const runExchange = useCallback(
    async (userText: string) => {
      const text = userText.trim();
      if (!text || busy || transcribing) return;

      stopRecording();
      setBusy(true);
      setError(null);
      stopHartMaatjeSpeech();

      const history = messagesRef.current;
      const userMsg: FennaMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
      };
      const withUser = [...history, userMsg];
      messagesRef.current = withUser;
      setMessages(withUser);
      saveFennaMessages(withUser);

      const { reply, error: err } = await sendFennaMessage(text, lang, history);

      if (err || !reply) {
        setError(err ?? app.errors.couldNotReadReply);
        setBusy(false);
        return;
      }

      const aiMsg: FennaMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: reply,
      };
      const next = [...withUser, aiMsg];
      messagesRef.current = next;
      setMessages(next);
      saveFennaMessages(next);
      setBusy(false);
      void speakFenna(reply);
    },
    [app.errors.couldNotReadReply, busy, lang, speakFenna, stopRecording, transcribing],
  );

  const toggleMic = useCallback(async () => {
    if (busy || transcribing) return;
    setError(null);

    if (recording) {
      stopRecording();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(app.errors.micNotSupported);
      setShowType(true);
      return;
    }

    stopHartMaatjeSpeech();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];

      rec.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      rec.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setRecording(false);

        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        chunksRef.current = [];

        if (!blob.size) {
          setError(app.errors.notHeardWell);
          return;
        }

        setTranscribing(true);
        const out = await transcribeAudioBlob(blob, lang);
        setTranscribing(false);

        if (out.error || !out.text?.trim()) {
          setError(out.error ?? app.errors.notHeardWell);
          setShowType(true);
          return;
        }

        void runExchange(out.text);
      };

      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setRecording(false);
      setError(app.errors.micNotSupported);
      setShowType(true);
    }
  }, [
    app.errors.micNotSupported,
    app.errors.notHeardWell,
    busy,
    lang,
    recording,
    runExchange,
    stopRecording,
    transcribing,
  ]);

  const statusText = recording
    ? copy.statusRecording
    : transcribing
      ? copy.statusTranscribing
      : busy
        ? copy.statusBusy
        : speaking
          ? lang === "en"
            ? "Fenna is speaking…"
            : "Fenna spreekt…"
          : copy.statusIdle;

  const micDisabled = busy || transcribing || speaking;

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-[#f8f2e8]/70 bg-[#faf6f0]/95 shadow-[0_18px_44px_rgba(44,36,22,0.2)] backdrop-blur-md">
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center justify-center gap-3 border-b border-[#e8dfd0]/55 px-5 py-3.5 text-center text-2xl font-semibold sm:text-[1.8rem] ${
          recording
            ? "bg-[#fff5ee] text-[#8b4a2a]"
            : transcribing || busy || speaking
              ? "bg-[#eef8f7] text-[#2d5a55]"
              : "bg-[#f5f0e8]/80 text-[#4a6741]"
        }`}
      >
        <span
          className={`hm-pulse-dot h-3 w-3 shrink-0 rounded-full ${
            recording
              ? "bg-[#c45c3e]"
              : transcribing || busy || speaking
                ? "bg-[#5aabaa]"
                : "bg-[#4a6741]"
          }`}
          aria-hidden="true"
        />
        {statusText}
      </div>

      <div className="border-b border-[#e8dfd0]/55 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col items-center gap-3">
          <div className={`rounded-full p-3 ${hartmaatjeGreenSurfaceClass}`}>
            <AvatarPortrait
              identityId="fenna"
              displayName="Fenna"
              size="xl"
              className="border-4 border-white shadow-lg"
            />
          </div>
          <p className="text-center text-2xl font-bold text-[#2c4a22] sm:text-3xl">
            Fenna
          </p>
          <p className="text-center text-lg text-[#5c4a32] sm:text-xl">
            {lang === "en"
              ? "Your calm maatje to talk with."
              : "Uw rustige maatje om mee te praten."}
          </p>
        </div>
      </div>

      <div className="max-h-72 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        {messages.length === 0 ? (
          <p className="py-4 text-center text-xl leading-relaxed text-[#5c4a32] sm:text-2xl">
            {lang === "en"
              ? "Tap the microphone and tell Fenna what is on your mind."
              : "Druk op de microfoon en vertel Fenna wat u bezighoudt."}
          </p>
        ) : (
          <div className="space-y-5">
            {messages.map((m) => (
              <div key={m.id} className="space-y-1.5">
                <p className="text-lg font-medium text-[#8a7a66]">
                  {m.role === "user"
                    ? app.chat.userSaidLabel
                    : "Fenna"}
                </p>
                <div
                  className={`rounded-3xl px-5 py-4 text-xl leading-relaxed sm:text-2xl ${
                    m.role === "user"
                      ? "border border-[#e8dfd0]/60 bg-[#faf6f0]/80 text-[#5c4a32]"
                      : "border border-[#e8dfd0]/80 bg-gradient-to-br from-[#fffdf9] to-[#faf6f0] text-[#2c2416]"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={listEndRef} />
      </div>

      {error ? (
        <p
          role="alert"
          className="mx-5 mb-3 rounded-2xl border border-[#d8a574] bg-[#fff8ee] px-5 py-3 text-lg text-[#6b4a2a] sm:text-xl"
        >
          {error}
        </p>
      ) : null}

      <div className="border-t border-[#e8dfd0]/55 px-4 py-5 sm:px-6">
        <div className="flex justify-center">
          <button
            type="button"
            aria-label={
              recording ? app.chat.micListeningAria : app.chat.micStartAria
            }
            onClick={() => void toggleMic()}
            disabled={micDisabled}
            className={`flex h-[6.5rem] w-[6.5rem] items-center justify-center rounded-full border-[6px] shadow-[0_10px_24px_rgba(44,36,22,0.24)] transition hover:scale-[1.05] disabled:opacity-50 sm:h-[7.5rem] sm:w-[7.5rem] ${
              recording
                ? "border-red-500 bg-gradient-to-br from-red-500 to-red-600"
                : hartmaatjeMicButtonClass
            }`}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white bg-white text-[#4a6741] sm:h-[4.5rem] sm:w-[4.5rem]">
              <MicGlyph
                className={`h-9 w-9 sm:h-10 sm:w-10 ${
                  recording ? "text-red-600" : "text-[#4a6741]"
                }`}
              />
            </span>
          </button>
        </div>
        <p className="mt-3 text-center text-lg text-[#5c4a32] sm:text-xl">
          {recording
            ? lang === "en"
              ? "Speak now. Tap the microphone again when you are done."
              : "Spreek nu. Druk nogmaals op de microfoon als u klaar bent."
            : copy.voiceInstruction}
        </p>

        {!showType ? (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => setShowType(true)}
              className="text-lg text-[#8a7a66] hover:text-[#5c4a32] sm:text-xl"
            >
              {app.chat.preferTyping}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3 rounded-2xl border border-[#d8ccb8]/80 bg-white/60 p-4">
            <textarea
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={app.chat.composerPlaceholder}
              rows={2}
              disabled={micDisabled}
              className="w-full resize-none rounded-2xl border-2 border-[#d8ccb8]/80 bg-white px-4 py-3 text-xl text-[#2c2416] focus:border-[#5aabaa] focus:outline-none sm:text-2xl"
            />
            <button
              type="button"
              disabled={micDisabled || !typed.trim()}
              onClick={() => {
                const t = typed.trim();
                setTyped("");
                void runExchange(t);
              }}
              className={`w-full px-6 py-3.5 text-xl font-semibold sm:text-2xl ${hartmaatjeGreenButtonClass} disabled:opacity-50`}
            >
              {app.chat.sendButton}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

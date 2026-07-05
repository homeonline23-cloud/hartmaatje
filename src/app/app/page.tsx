"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  GESPREK_INTRO,
  normalizePresetId,
} from "@/lib/constants";
import { getSupabase, getAuthSession } from "@/lib/supabase";
import { sendChatMessage } from "@/lib/sendChat";
import {
  loadGuestMessages,
  saveGuestMessages,
  type GuestMessage,
} from "@/lib/guestChat";
import { speakDutch, stopSpeaking } from "@/lib/tts";
import { transcribeAudioBlob, isVoiceTypingFallback } from "@/lib/transcribeAudio";

type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const { profile } = useAuth();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [items, setItems] = useState<ConversationMessage[]>([]);
  const [composer, setComposer] = useState("");
  const [loadingThread, setLoadingThread] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [showTypingOption, setShowTypingOption] = useState(false);
  const [typingFallbackHint, setTypingFallbackHint] = useState<string | null>(
    null,
  );

  const listEndRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const greeting = useMemo(() => {
    const n = profile?.display_name?.trim();
    if (n) return `Goedendag, ${n}.`;
    return "Ik ben hier. Neem gerust uw tijd.";
  }, [profile?.display_name]);

  const statusLabel = useMemo(() => {
    if (loadingThread) return "Even geduld…";
    if (recording) return "Ik luister naar u…";
    if (transcribing) return "Ik luister wat u zei na…";
    if (busy) return "Ik denk even na…";
    if (composer.trim()) return "Zo hoorde ik het — mag het door?";
    return "Praat gerust — ik ben er.";
  }, [loadingThread, recording, transcribing, busy, composer]);

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
      const client = getSupabase();
      if (!client) {
        setItems(loadGuestMessages());
        setLoadingThread(false);
        return;
      }
      const session = await getAuthSession(client);
      if (!session) {
        setItems(loadGuestMessages());
        setLoadingThread(false);
        return;
      }
      setLoadingThread(true);
      const thr = await client
        .from("conversation_threads")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancel) return;
      if (!thr.error && thr.data?.id) {
        setThreadId(thr.data.id);
        await reloadMessages(thr.data.id);
      }
      setLoadingThread(false);
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

  const lastAssistantText = useMemo(
    () =>
      [...items].reverse().find((m) => m.role === "assistant")?.content ?? null,
    [items],
  );

  const replayLast = () => {
    if (!lastAssistantText) return;
    speakDutch(lastAssistantText, {
      preset: normalizePresetId(profile?.tts_preset_id),
      rate:
        typeof profile?.tts_playback_rate === "number"
          ? profile.tts_playback_rate
          : 1.06,
    });
  };

  const onSend = async () => {
    const text = composer.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    const prevComposer = composer;
    setComposer("");

    const prevId = threadId;
    const outcome = await sendChatMessage(prevId, text);

    if (outcome.data?.prompt_version === "guest") {
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
      setBusy(false);
      return;
    }

    if (outcome.data?.thread_id) setThreadId(outcome.data.thread_id);
    await reloadMessages(outcome.data?.thread_id ?? prevId ?? null);
    setBusy(false);

    if (outcome.error) {
      setComposer(prevComposer);
      setError(outcome.error);
    }
  };

  const toggleMic = async () => {
    setError(null);
    if (transcribing) return;

    if (recorderRef.current && recording) {
      recorderRef.current.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Praten lukt nu even niet in uw browser. Probeer het later opnieuw.");
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
        const out = await transcribeAudioBlob(blob);
        setTranscribing(false);
        if (out.error) {
          if (isVoiceTypingFallback(out.error)) {
            setTypingFallbackHint(out.error);
            setShowTypingOption(true);
            return;
          }
          setError(out.error);
          return;
        }
        const spoken = out.text ?? "";
        if (!spoken) {
          setError("Ik hoorde u niet goed — praat gerust opnieuw.");
          return;
        }
        setComposer((prev) => (prev ? `${prev.trimEnd()} ${spoken}` : spoken));
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError("De microfoon startte niet. Geef toestemming en probeer opnieuw.");
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl bg-[#faf6f0]/93 shadow-xl backdrop-blur-md">
      <p className="border-b border-[#e8dfd0]/50 px-4 py-3 text-center text-base leading-relaxed text-[#5c4a32] sm:text-lg">
        {GESPREK_INTRO}
      </p>

      <div
        role="status"
        aria-live="polite"
        className={`flex items-center justify-center gap-3 border-b border-[#e8dfd0]/50 px-5 py-3.5 text-center text-lg font-medium ${
          recording
            ? "bg-[#fff5ee] text-[#8b4a2a]"
            : busy || transcribing
              ? "bg-[#eef8f7] text-[#2d5a55]"
              : "bg-[#f5f0e8]/80 text-[#4a6741]"
        }`}
      >
        {!loadingThread && (
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

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {loadingThread ? (
          <p className="py-8 text-center text-xl text-[#5c4a32]">
            Even geduld…
          </p>
        ) : items.length === 0 ? (
          <div className="hm-float-soft py-6 text-center">
            <p className="text-2xl font-medium leading-snug text-[#2c2416]">
              {greeting}
            </p>
          </div>
        ) : (
          items.map((m) => (
            <div key={m.id} className="space-y-2">
              <p className="text-base font-medium text-[#8a7a66]">
                {m.role === "user" ? "U zei" : "HartMaatje"}
              </p>
              <div
                className={`rounded-3xl px-5 py-4 text-xl leading-relaxed ${
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

      {error ? (
        <p
          role="alert"
          className="mx-5 mb-3 rounded-2xl border border-[#d8a574] bg-[#fff8ee] px-5 py-4 text-lg text-[#6b4a2a]"
        >
          {error}
        </p>
      ) : null}

      <div className="border-t border-[#e8dfd0]/50 px-4 pb-5 pt-4">
        {composer.trim() ? (
          <div className="mb-4 rounded-2xl border border-[#d8ccb8] bg-[#f5f0e8] px-4 py-3 text-center">
            <p className="mb-1 text-base text-[#8a7a66]">Ik hoorde u zeggen:</p>
            <p className="text-lg leading-relaxed text-[#2c2416]">
              &ldquo;{composer.trim()}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => void onSend()}
              disabled={busy || loadingThread || transcribing}
              className="mt-3 w-full rounded-2xl bg-gradient-to-br from-[#4a6741] to-[#3d7a6e] px-6 py-4 text-xl font-semibold text-white shadow-md shadow-[#4a6741]/25 disabled:from-[#b8a888] disabled:to-[#b8a888] disabled:shadow-none"
            >
              {busy ? "Even geduld…" : "Ja, zo is het goed"}
            </button>
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-2">
          {showMicCue ? (
            <p className="text-center text-lg font-medium text-[#5c4a32]">
              Praat opnieuw als het niet klopt
            </p>
          ) : null}
          <button
            type="button"
            aria-label={
              recording ? "Ik luister naar u" : "Begin met praten"
            }
            onClick={() => void toggleMic()}
            disabled={busy || loadingThread || transcribing}
            className={`flex h-24 w-24 items-center justify-center rounded-full border-[5px] shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 sm:h-[6.5rem] sm:w-[6.5rem] ${
              recording
                ? "border-red-500 bg-gradient-to-br from-red-500 to-red-600"
                : "border-[#4a6741] bg-gradient-to-br from-[#4a6741] to-[#3d7a6e]"
            }`}
          >
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white sm:h-16 sm:w-16"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-2xl sm:h-9 sm:w-9 sm:text-3xl ${
                  recording ? "bg-white text-red-600" : "bg-white text-[#4a6741]"
                }`}
                aria-hidden="true"
              >
                {transcribing ? "…" : "🎤"}
              </span>
            </span>
          </button>
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              replayLast();
            }}
            disabled={!lastAssistantText}
            className="rounded-2xl border border-[#d8ccb8] bg-white/80 px-5 py-2.5 text-lg font-medium text-[#2c2416] disabled:opacity-40"
          >
            🔊 Nog eens horen
          </button>
        </div>

        {!showTypingOption ? (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => {
                setTypingFallbackHint(null);
                setShowTypingOption(true);
              }}
              className="text-sm text-[#a89880] hover:text-[#8a7a66]"
            >
              Liever opschrijven?
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-[#d8ccb8]/80 bg-white/60 p-4">
            <p className="mb-2 text-center text-base text-[#8a7a66]">
              {typingFallbackHint ?? "Alleen als praten even niet lukt"}
            </p>
            <textarea
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              placeholder="Wat wilt u vertellen?"
              rows={2}
              disabled={busy || loadingThread || transcribing}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void onSend();
                }
              }}
              className="max-h-32 w-full resize-none rounded-2xl border-2 border-[#d8ccb8]/80 bg-white px-4 py-3 text-lg text-[#2c2416] focus:border-[#5aabaa] focus:outline-none focus:ring-2 focus:ring-[#5aabaa]/30"
            />
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void onSend()}
                disabled={
                  busy || loadingThread || transcribing || !composer.trim()
                }
                className="rounded-2xl bg-gradient-to-br from-[#4a6741] to-[#3d7a6e] px-6 py-3 text-lg font-semibold text-white disabled:from-[#b8a888] disabled:to-[#b8a888]"
              >
                Doorgeven
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTypingOption(false);
                  setTypingFallbackHint(null);
                  setComposer("");
                }}
                className="rounded-2xl border border-[#d8ccb8] bg-white px-6 py-3 text-lg text-[#5c4a32]"
              >
                Sluiten
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

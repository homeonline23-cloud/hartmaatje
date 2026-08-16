"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useI18n } from "@/i18n/LanguageProvider";
import { isCloseChatPhrase } from "@/lib/continuousListener";
import {
  isMicPermissionError,
  micErrorText,
  releaseMicrophone,
  requestMicrophoneStream,
} from "@/lib/micAccess";
import { releaseAllMicrophones } from "@/lib/micExclusive";
import { playBase64Audio } from "@/lib/micRecorder";
import {
  clearSessionHistory,
  closeSession,
  createSession,
  patchSessionLocale,
  type CompanionId,
  type SessionResponse,
} from "@/lib/sessionApi";
import { streamChat } from "@/lib/voiceApi";
import { silenceHmMedia, trackHmMedia } from "@/lib/hmMedia";
import {
  PcmPlaybackQueue,
  arrayBufferToBase64,
  startPcmCapture,
  type PcmCaptureHandle,
} from "@/lib/realtimeAudio";
import {
  audioDeltaPayload,
  buildLanguageLockUpdate,
  buildSessionUpdate,
  buildTextAnchoredResponseCreate,
  realtimeWsUrl,
} from "@/lib/realtimeClient";
import { isBlockedRealtimeTranscript, isLikelyGarbageStt, isWhisperHallucination, sanitizeUserTranscript } from "@/lib/whisperHallucination";
import { getCompanionIntro } from "@/lib/companionKnowledge";

export type HmEvent = {
  type: string;
  session_id: string;
  turn_id?: string | null;
  seq: number;
  ts: string;
  source: string;
  payload: Record<string, unknown>;
};

export type ChatLine = {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** True while tokens are still streaming into this bubble. */
  streaming?: boolean;
};

export type VoiceUiState = {
  phase:
    | "boot"
    | "connecting"
    | "ready"
    | "live"
    | "thinking"
    | "speaking"
    | "error";
  session: SessionResponse | null;
  fsmState: string;
  chat: ChatLine[];
  mapPlace: { name: string; summary: string; lat: number; lon: number } | null;
  statusLabel: string;
  errorMessage: string | null;
  events: HmEvent[];
  connected: boolean;
  micLive: boolean;
  userSpeaking: boolean;
  micLevel: number;
  /** Live mouth open 0..1 from streaming AI audio (continuous lip sync). */
  speechLevel: number;
  starting: boolean;
  /** @deprecated clip-based; kept for compatibility — prefer speechLevel */
  avatarVideoUrl: string | null;
};

function playAudioAndWait(
  base64: string,
  mime: string,
  timeoutMs = 20_000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { audio, stop, play } = playBase64Audio(base64, mime);
    const timer = window.setTimeout(() => {
      stop();
      resolve();
    }, timeoutMs);
    const done = () => {
      window.clearTimeout(timer);
      stop();
      resolve();
    };
    audio.onended = done;
    audio.onerror = () => {
      window.clearTimeout(timer);
      stop();
      reject(new Error("audio_play_failed"));
    };
    void play().catch(() => {
      window.clearTimeout(timer);
      stop();
      reject(new Error("audio_play_blocked"));
    });
  });
}

/**
 * Voice mode = OpenAI Realtime via Next.js `/api/realtime` WebSocket proxy (PCM in/out).
 * Text mode = existing Ollama `/api/chat` stream (unchanged).
 */
export function useVoiceSession(companionId: CompanionId) {
  const { t, locale, ready: i18nReady } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const [ui, setUi] = useState<VoiceUiState>({
    phase: "boot",
    session: null,
    fsmState: "IDLE",
    chat: [],
    mapPlace: null,
    statusLabel: t.status.ready,
    errorMessage: null,
    events: [],
    connected: true,
    micLive: false,
    userSpeaking: false,
    micLevel: 0,
    speechLevel: 0,
    starting: false,
    avatarVideoUrl: null,
  });

  const sessionIdRef = useRef<string | null>(null);
  const companionIdRef = useRef(companionId);
  companionIdRef.current = companionId;
  const sessionCreateRef = useRef<Promise<string> | null>(null);

  const realtimeWsRef = useRef<WebSocket | null>(null);
  const captureRef = useRef<PcmCaptureHandle | null>(null);
  const playbackRef = useRef<PcmPlaybackQueue | null>(null);
  const voiceLiveRef = useRef(false);
  const pcmMutedRef = useRef(false);
  /** Mute mic uplink while Fenna speaks — otherwise Whisper hears her and prints it as "U". */
  const echoMuteRef = useRef(false);
  const echoMuteSinceRef = useRef(0);
  /** Wall-clock when Fenna last finished speaking (blocks echo STT). */
  const aiIdleAtRef = useRef(0);
  const aiSpeakingRef = useRef(false);
  const responseActiveRef = useRef(false);
  const lastAssistantTextRef = useRef("");
  const streamingAssistIdRef = useRef<string | null>(null);
  const userLineIdRef = useRef<string | null>(null);
  /** True until Whisper fills (or fallback prints) the current user turn. */
  const awaitingUserTranscriptRef = useRef(false);
  const transcriptFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  /** If STT never arrives, still nudge a reply so UI does not freeze on thinking */
  const replySafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Conversational Anchoring: first speech after Aan before VAD may fire. */
  const firstSpeechAnchoredRef = useRef(false);
  /** Prevent double response.create for the same transcribed item */
  const repliedItemIdRef = useRef<string | null>(null);
  /** Fast audio-turn already fired this user utterance (skip Whisper-gated reply) */
  const replyStartedForTurnRef = useRef(false);
  /** Realtime conversation item ids — trimmed so the chat keeps a short memory */
  const conversationItemIdsRef = useRef<Set<string>>(new Set());
  /** Keep ~4 turns (user+assistant) so Fenna can continue the thread */
  const MAX_CONVERSATION_ITEMS = 8;
  /** User spoke while she was still playing — reply after speakers go idle */
  const pendingReplyRef = useRef<{ text: string; itemId?: string } | null>(
    null
  );
  const closingRef = useRef(false);
  const startingRef = useRef(false);
  const aliveRef = useRef(true);

  const clearTranscriptFallbackTimer = useCallback(() => {
    if (transcriptFallbackTimerRef.current) {
      clearTimeout(transcriptFallbackTimerRef.current);
      transcriptFallbackTimerRef.current = null;
    }
  }, []);

  const clearReplySafetyTimer = useCallback(() => {
    if (replySafetyTimerRef.current) {
      clearTimeout(replySafetyTimerRef.current);
      replySafetyTimerRef.current = null;
    }
  }, []);

  const sendRealtime = useCallback((payload: Record<string, unknown>) => {
    const ws = realtimeWsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(payload));
  }, []);

  /**
   * Trim old Realtime items but keep a short rolling memory —
   * so the companion can continue a real two-person chat.
   */
  const purgeConversationHistory = useCallback(
    (keepItemId?: string | null) => {
      const keep = (keepItemId || "").trim();
      const ids = [...conversationItemIdsRef.current];
      let retained = ids.slice(-MAX_CONVERSATION_ITEMS);
      if (keep && !retained.includes(keep)) {
        retained = [...retained, keep].slice(-MAX_CONVERSATION_ITEMS);
      }
      const retainSet = new Set(retained);
      conversationItemIdsRef.current = retainSet;
      let deleted = 0;
      for (const id of ids) {
        if (retainSet.has(id)) continue;
        // Best-effort — missing ids are ignored in the error handler
        sendRealtime({ type: "conversation.item.delete", item_id: id });
        deleted += 1;
      }
      if (deleted || keep) {
        console.log("[hm-voice] trimmed conversation history", {
          deleted,
          kept: retainSet.size,
          keep: keep || null,
        });
      }
    },
    [sendRealtime]
  );

  /** Ensure a user bubble exists; return its id. */
  const ensureUserBubble = useCallback(
    (text: string, opts?: { placeholder?: boolean }) => {
      const existing = userLineIdRef.current;
      if (existing) {
        setUi((p) => ({
          ...p,
          chat: p.chat.map((line) =>
            line.id === existing
              ? {
                  ...line,
                  text: text || line.text,
                  streaming: Boolean(opts?.placeholder),
                }
              : line
          ),
        }));
        return existing;
      }
      const userId = `u-${Date.now()}`;
      userLineIdRef.current = userId;
      setUi((p) => ({
        ...p,
        chat: [
          ...p.chat,
          {
            id: userId,
            role: "user" as const,
            text,
            streaming: Boolean(opts?.placeholder),
          },
        ],
      }));
      return userId;
    },
    []
  );

  const fillUserTranscript = useCallback(
    (
      transcript: string,
      opts?: { forceShow?: boolean }
    ): "ok" | "echo" | "hallucination" | "empty" | "close" => {
      const text = transcript.trim();
      if (!text) return "empty";

      const norm = (s: string) =>
        s
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, " ")
          .trim();
      const assist = norm(lastAssistantTextRef.current);
      const userNorm = norm(text);
      const looksLikeEcho =
        assist.length > 12 &&
        userNorm.length > 12 &&
        (assist === userNorm ||
          (userNorm.length > 20 && assist.includes(userNorm)) ||
          (assist.length > 20 && userNorm.includes(assist)));
      const aiPlaying =
        aiSpeakingRef.current || Boolean(playbackRef.current?.isPlaying);

      // Only drop true speaker-echo of Fenna's last line.
      // Never wipe the U bubble for normal speech after she finishes — that hid
      // user words and made her answer leftover/hallucinated text instead.
      if (looksLikeEcho) {
        console.warn("[hm-stt] dropped echo transcript", text);
        clearTranscriptFallbackTimer();
        clearReplySafetyTimer();
        awaitingUserTranscriptRef.current = false;
        sendRealtime({ type: "response.cancel" });
        sendRealtime({ type: "input_audio_buffer.clear" });
        setUi((p) => ({
          ...p,
          userSpeaking: false,
          phase: p.micLive ? "live" : p.phase,
          statusLabel: tRef.current.conversation.keepTalking,
          chat: userLineIdRef.current
            ? p.chat.filter((l) => l.id !== userLineIdRef.current)
            : p.chat,
        }));
        userLineIdRef.current = null;
        return "echo";
      }

      // While her audio still plays: show STT under U, queue real reply for idle
      if (aiPlaying) {
        console.warn("[hm-stt] queue user speech during AI playback", text);
        clearTranscriptFallbackTimer();
        awaitingUserTranscriptRef.current = false;
        ensureUserBubble(text, { placeholder: false });
        setUi((p) => {
          const id = userLineIdRef.current;
          return {
            ...p,
            userSpeaking: false,
            phase: p.micLive ? "live" : p.phase,
            statusLabel: tRef.current.conversation.keepTalking,
            chat: id
              ? p.chat.map((l) =>
                  l.id === id ? { ...l, text, streaming: false } : l
                )
              : p.chat,
          };
        });
        if (!isLikelyGarbageStt(text)) {
          pendingReplyRef.current = { text };
        }
        return "echo";
      }

      const hallu = isWhisperHallucination(text);
      // Always show what STT heard under "U" (unless pure empty).
      // Hallucinations still skip the companion reply elsewhere.
      if (hallu && !opts?.forceShow) {
        console.warn("[hm-stt] show+flag Whisper hallucination", text);
        // Still paint the bubble so the window is not blank "U"
        clearTranscriptFallbackTimer();
        awaitingUserTranscriptRef.current = false;
        ensureUserBubble(text, { placeholder: false });
        setUi((p) => {
          const id = userLineIdRef.current;
          return {
            ...p,
            phase: p.micLive ? "live" : p.phase,
            statusLabel: tRef.current.conversation.keepTalking,
            chat: id
              ? p.chat.map((l) =>
                  l.id === id ? { ...l, text, streaming: false } : l
                )
              : p.chat,
          };
        });
        return "hallucination";
      }

      clearTranscriptFallbackTimer();
      awaitingUserTranscriptRef.current = false;
      if (isCloseChatPhrase(text)) {
        void closeChatRef.current?.();
        return "close";
      }
      console.log("[hm-stt] show user transcript", text);
      ensureUserBubble(text, { placeholder: false });
      setUi((p) => {
        const id = userLineIdRef.current;
        return {
          ...p,
          phase: p.micLive ? "live" : p.phase,
          statusLabel: tRef.current.conversation.keepTalking,
          chat: id
            ? p.chat.map((l) =>
                l.id === id ? { ...l, text, streaming: false } : l
              )
            : p.chat,
        };
      });
      return "ok";
    },
    [clearTranscriptFallbackTimer, clearReplySafetyTimer, ensureUserBubble, sendRealtime]
  );

  /** Dig user transcript out of a response.done (or similar) payload. */
  const extractUserTranscriptFromEvent = useCallback(
    (raw: Record<string, unknown>): string | null => {
      const walk = (obj: unknown, depth: number): string | null => {
        if (depth > 10 || obj == null) return null;
        if (typeof obj !== "object") return null;
        if (Array.isArray(obj)) {
          for (const item of obj) {
            const found = walk(item, depth + 1);
            if (found) return found;
          }
          return null;
        }
        const o = obj as Record<string, unknown>;
        const role = String(o.role || "");
        // Never treat assistant/system lines as the user's words — that made
        // Fenna's own speech look like an "echo" and froze the turn.
        if (role === "assistant" || role === "system") return null;
        if (role === "user") {
          if (typeof o.transcript === "string" && o.transcript.trim()) {
            return o.transcript.trim();
          }
          if (Array.isArray(o.content)) {
            for (const part of o.content) {
              if (!part || typeof part !== "object") continue;
              const p = part as Record<string, unknown>;
              if (typeof p.transcript === "string" && p.transcript.trim()) {
                return p.transcript.trim();
              }
              if (typeof p.text === "string" && p.text.trim()) {
                return p.text.trim();
              }
            }
          }
        }
        // Prefer nested conversation / item trees over random transcript fields
        for (const key of [
          "conversation",
          "item",
          "items",
          "output",
          "content",
          "response",
        ]) {
          if (key in o) {
            const found = walk(o[key], depth + 1);
            if (found) return found;
          }
        }
        for (const [key, val] of Object.entries(o)) {
          // Only accept explicit user-role transcripts (not generic "message")
          if (
            key === "transcript" &&
            typeof val === "string" &&
            val.trim() &&
            role === "user"
          ) {
            return val.trim();
          }
          if (key === "transcript" || key === "delta") continue;
          const found = walk(val, depth + 1);
          if (found) return found;
        }
        return null;
      };

      return walk(raw.response ?? raw, 0);
    },
    []
  );

  const stopPlayback = useCallback(() => {
    playbackRef.current?.stop();
    silenceHmMedia("voice");
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    aiSpeakingRef.current = false;
  }, []);

  /**
   * Single-trigger reply: ONE assistant response per real user utterance.
   * Always text-anchored — Whisper already heard them; audio-only replies falsely said "I can't hear you".
   */
  const requestCompanionReply = useCallback(
    (transcript: string, itemId?: string) => {
      const text = sanitizeUserTranscript(transcript);
      if (!text) return;
      if (isLikelyGarbageStt(text)) {
        console.warn("[hm-stt] refuse garbage STT", text);
        return;
      }
      if (itemId && repliedItemIdRef.current === itemId) return;

      if (responseActiveRef.current || aiSpeakingRef.current) {
        // Replace a wrong/previous reply with this transcript (never skip real words)
        console.log("[hm-voice] cancel active reply — replace with text", text);
        stopPlayback();
        sendRealtime({ type: "response.cancel" });
        responseActiveRef.current = false;
        aiSpeakingRef.current = false;
        echoMuteRef.current = false;
        echoMuteSinceRef.current = 0;
        streamingAssistIdRef.current = null;
      }
      if (itemId) repliedItemIdRef.current = itemId;

      purgeConversationHistory(itemId || null);
      pendingReplyRef.current = null;
      replyStartedForTurnRef.current = true;

      console.log("[hm-voice] Triggering text-anchored reply:", text, itemId);
      sendRealtime(
        buildTextAnchoredResponseCreate(text, {
          companionId: companionIdRef.current,
          locale: localeRef.current,
        })
      );
    },
    [purgeConversationHistory, sendRealtime, stopPlayback]
  );

  /** Cancel companion reply after fake Whisper subtitle — do not keep junk under U. */
  const discardHallucinatedTurn = useCallback(
    (transcript: string, itemId?: string) => {
      console.warn("[hm-stt] discard hallucinated turn", transcript);
      clearTranscriptFallbackTimer();
      clearReplySafetyTimer();
      awaitingUserTranscriptRef.current = false;
      firstSpeechAnchoredRef.current = false;

      stopPlayback();
      sendRealtime({ type: "response.cancel" });
      sendRealtime({ type: "input_audio_buffer.clear" });
      if (itemId) {
        sendRealtime({
          type: "conversation.item.delete",
          item_id: itemId,
        });
        conversationItemIdsRef.current.delete(itemId);
      }

      const assistId = streamingAssistIdRef.current;
      const userId = userLineIdRef.current;
      streamingAssistIdRef.current = null;
      userLineIdRef.current = null;
      responseActiveRef.current = false;
      echoMuteRef.current = false;
      echoMuteSinceRef.current = 0;

      setUi((p) => ({
        ...p,
        userSpeaking: false,
        phase: "live",
        statusLabel: tRef.current.conversation.keepTalking,
        // Remove junk "U" line + half assistant line — do not keep gibberish on screen
        chat: p.chat.filter(
          (l) => l.id !== assistId && l.id !== userId
        ),
      }));
    },
    [
      clearReplySafetyTimer,
      clearTranscriptFallbackTimer,
      sendRealtime,
      stopPlayback,
    ]
  );

  /** Barge-in: stop local audio; cancel upstream ONLY while AI is actively responding. */
  const interruptAi = useCallback(() => {
    const aiActive = responseActiveRef.current || aiSpeakingRef.current;
    if (!aiActive) return;

    const shouldCancelResponse = responseActiveRef.current;
    stopPlayback();
    aiSpeakingRef.current = false;

    if (shouldCancelResponse) {
      sendRealtime({ type: "response.cancel" });
      responseActiveRef.current = false;
    }

    setUi((p) => ({
      ...p,
      phase: "live",
      statusLabel: tRef.current.conversation.keepTalking,
    }));
  }, [sendRealtime, stopPlayback]);

  const handleRealtimeEvent = useCallback(
    (raw: Record<string, unknown>) => {
      const type = String(raw.type || "");

      if (type === "error") {
        const err = (raw.error as { message?: string } | undefined)?.message;
        const msg = String(err || "");
        // Ignore benign cancel / cleanup races — do not flash them at seniors
        if (
          /cancel/i.test(msg) ||
          /no active response/i.test(msg) ||
          /already.*cancel/i.test(msg) ||
          /does not exist/i.test(msg) ||
          /deleting item/i.test(msg) ||
          /item.*not found/i.test(msg)
        ) {
          console.warn("[hm-realtime] ignored benign error", msg);
          return;
        }
        setUi((p) => ({
          ...p,
          errorMessage: err || tRef.current.errors.generic,
        }));
        return;
      }

      if (type === "session.updated" || type === "session.created") {
        setUi((p) => ({
          ...p,
          connected: true,
          phase: p.micLive ? "live" : p.phase,
        }));
        return;
      }

      // Debug STT pipeline — remove noise once stable
      if (
        type.includes("transcription") ||
        type === "conversation.item.done" ||
        type === "input_audio_buffer.committed"
      ) {
        console.log("[hm-stt-event]", type, {
          transcript: (raw as { transcript?: string }).transcript,
          delta: (raw as { delta?: string }).delta,
          item: (raw as { item?: unknown }).item,
        });
      }

      if (type === "conversation.item.input_audio_transcription.failed") {
        console.warn("[hm-stt] transcription failed", raw);
        clearReplySafetyTimer();
        awaitingUserTranscriptRef.current = false;
        // Do NOT invent a reply from raw audio — that caused grabbelton answers
        setUi((p) => ({
          ...p,
          userSpeaking: false,
          phase: p.micLive ? "live" : p.phase,
          statusLabel: tRef.current.conversation.keepTalking,
        }));
        return;
      }

      if (type === "input_audio_buffer.speech_started") {
        // User talking while she still plays = barge-in (stop her, listen to user)
        if (echoMuteRef.current || aiSpeakingRef.current) {
          console.log("[hm-stt] barge-in — stop AI, listen to user");
          interruptAi();
          echoMuteRef.current = false;
          echoMuteSinceRef.current = 0;
          aiSpeakingRef.current = false;
          // Do NOT clear the buffer here — that wiped the user's opening words
        }
        // Conversational Anchoring — always show a user bubble for this turn
        firstSpeechAnchoredRef.current = true;
        repliedItemIdRef.current = null;
        replyStartedForTurnRef.current = false;
        // New turn only if previous transcript was already finalized
        if (!awaitingUserTranscriptRef.current) {
          userLineIdRef.current = null;
        }
        awaitingUserTranscriptRef.current = true;
        clearTranscriptFallbackTimer();
        clearReplySafetyTimer();
        ensureUserBubble("…", { placeholder: true });
        setUi((p) => ({
          ...p,
          userSpeaking: true,
          phase: "live",
          statusLabel: tRef.current.conversation.keepTalking,
        }));
        return;
      }

      if (type === "input_audio_buffer.committed") {
        const itemId = String(
          (raw as { item_id?: string }).item_id || ""
        ).trim();
        if (itemId) conversationItemIdsRef.current.add(itemId);
        // Do NOT reply here — wait for Whisper text (audio-only path falsely said "ik hoor u niet")
        return;
      }

      if (type === "input_audio_buffer.speech_stopped") {
        clearTranscriptFallbackTimer();
        clearReplySafetyTimer();
        // If Whisper lags, temporary placeholder — real text still overwrites later
        // NO replySafetyTimer / NO synthetic "Ik heb u niet goed verstaan" reply
        transcriptFallbackTimerRef.current = setTimeout(() => {
          transcriptFallbackTimerRef.current = null;
          if (!awaitingUserTranscriptRef.current) return;
          const id = userLineIdRef.current;
          setUi((p) => {
            const line = id ? p.chat.find((l) => l.id === id) : null;
            const stillEmpty =
              !line ||
              !line.text.trim() ||
              line.text.trim() === "…" ||
              line.streaming;
            if (!stillEmpty) {
              return p;
            }
            awaitingUserTranscriptRef.current = false;
            return {
              ...p,
              phase: p.micLive ? "live" : p.phase,
              statusLabel: tRef.current.conversation.keepTalking,
              chat: p.chat.map((l) =>
                l.id === id
                  ? {
                      ...l,
                      text: tRef.current.conversation.spokenPending,
                      streaming: false,
                    }
                  : l
              ),
            };
          });
        }, 2500);

        setUi((p) => ({
          ...p,
          userSpeaking: false,
          phase: "thinking",
          statusLabel: tRef.current.conversation.processingVoice,
        }));
        return;
      }

      if (
        type === "conversation.item.input_audio_transcription.delta" ||
        type === "conversation.item.input_audio_transcription.completed"
      ) {
        if (type === "conversation.item.input_audio_transcription.delta") {
          const delta = String((raw as { delta?: string }).delta || "");
          if (!delta.trim()) return;
          if (isBlockedRealtimeTranscript(delta)) {
            console.warn("[hm-stt] hard-blocked transcript delta", delta);
            sendRealtime({ type: "response.cancel" });
            sendRealtime({ type: "input_audio_buffer.clear" });
            return;
          }
          const id = userLineIdRef.current;
          setUi((p) => {
            const line = id ? p.chat.find((l) => l.id === id) : null;
            const prev =
              line &&
              line.text !== "…" &&
              !line.text.startsWith("[")
                ? line.text
                : "";
            const next = `${prev}${delta}`;
            if (id && line) {
              return {
                ...p,
                chat: p.chat.map((l) =>
                  l.id === id ? { ...l, text: next, streaming: true } : l
                ),
              };
            }
            const userId = `u-${Date.now()}`;
            userLineIdRef.current = userId;
            return {
              ...p,
              chat: [
                ...p.chat,
                {
                  id: userId,
                  role: "user" as const,
                  text: next,
                  streaming: true,
                },
              ],
            };
          });
          return;
        }

        const transcript = sanitizeUserTranscript(
          String(
            (raw as { transcript?: string }).transcript ||
              (raw as { text?: string }).text ||
              ""
          )
        );
        const itemId = String(
          (raw as { item_id?: string }).item_id || ""
        ).trim();
        if (itemId) conversationItemIdsRef.current.add(itemId);

        // HARD FILTER — ignore subtitle/TV hallucinations completely
        if (isBlockedRealtimeTranscript(transcript)) {
          console.warn("[hm-stt] hard-blocked transcript", transcript);
          clearReplySafetyTimer();
          clearTranscriptFallbackTimer();
          awaitingUserTranscriptRef.current = false;
          sendRealtime({ type: "response.cancel" });
          sendRealtime({ type: "input_audio_buffer.clear" });
          setUi((p) => ({
            ...p,
            userSpeaking: false,
            phase: p.micLive ? "live" : p.phase,
            statusLabel: tRef.current.conversation.keepTalking,
            chat: userLineIdRef.current
              ? p.chat.filter((l) => l.id !== userLineIdRef.current)
              : p.chat,
          }));
          userLineIdRef.current = null;
          return;
        }

        if (!transcript) {
          console.warn("[hm-stt] transcription.completed empty");
          awaitingUserTranscriptRef.current = false;
          setUi((p) => ({
            ...p,
            userSpeaking: false,
            phase: p.micLive ? "live" : p.phase,
            statusLabel: tRef.current.conversation.keepTalking,
          }));
          return;
        }
        // Always paint words under U first — only reply on real user speech
        const filled = fillUserTranscript(transcript);
        if (filled !== "ok") {
          if (filled === "hallucination") {
            discardHallucinatedTurn(transcript, itemId || undefined);
          }
          return;
        }
        if (isWhisperHallucination(transcript) || isLikelyGarbageStt(transcript)) {
          discardHallucinatedTurn(transcript, itemId || undefined);
          return;
        }
        clearReplySafetyTimer();
        requestCompanionReply(transcript, itemId || undefined);
        return;
      }

      // Display-only recovery — must NEVER trigger an assistant reply
      if (
        type === "conversation.item.done" ||
        type === "conversation.item.created" ||
        type === "conversation.item.truncated" ||
        type === "conversation.item.deleted"
      ) {
        const item = (raw as { item?: Record<string, unknown> }).item;
        const itemId = String(
          item?.id || (raw as { item_id?: string }).item_id || ""
        ).trim();
        if (type === "conversation.item.deleted") {
          if (itemId) conversationItemIdsRef.current.delete(itemId);
          return;
        }
        if (itemId) conversationItemIdsRef.current.add(itemId);

        const content = Array.isArray(item?.content)
          ? (item.content as Record<string, unknown>[])
          : [];
        for (const part of content) {
          const t = String(part?.transcript || "").trim();
          if (!t) continue;
          if (isBlockedRealtimeTranscript(t) || isWhisperHallucination(t)) {
            console.warn("[hm-stt] display-only skip blocked/hallucinated", t);
            discardHallucinatedTurn(t, itemId || undefined);
            return;
          }
          // Fill user bubble text only — no requestCompanionReply
          fillUserTranscript(t);
          return;
        }
        const recovered = extractUserTranscriptFromEvent(raw);
        if (recovered) {
          if (
            isBlockedRealtimeTranscript(recovered) ||
            isWhisperHallucination(recovered)
          ) {
            discardHallucinatedTurn(recovered, itemId || undefined);
            return;
          }
          // Display-only — no requestCompanionReply
          fillUserTranscript(recovered);
        }
        return;
      }

      if (type === "response.created" || type === "response.output_item.added") {
        responseActiveRef.current = true;
        clearReplySafetyTimer();
        // Mute uplink immediately so speaker bleed cannot start the next turn
        if (!echoMuteRef.current) {
          echoMuteRef.current = true;
          echoMuteSinceRef.current = Date.now();
          sendRealtime({ type: "input_audio_buffer.clear" });
        }
        if (!streamingAssistIdRef.current) {
          const assistId = `a-rt-${Date.now()}`;
          streamingAssistIdRef.current = assistId;
          setUi((p) => ({
            ...p,
            phase: "thinking",
            chat: [
              ...p.chat,
              { id: assistId, role: "assistant", text: "", streaming: true },
            ],
          }));
        }
        return;
      }

      // Only show what was actually spoken (audio transcript) — never separate text deltas
      if (
        type === "response.audio_transcript.delta" ||
        type === "response.output_audio_transcript.delta"
      ) {
        const delta = String(raw.delta || "");
        if (!delta) return;
        let assistId = streamingAssistIdRef.current;
        if (!assistId) {
          assistId = `a-rt-${Date.now()}`;
          streamingAssistIdRef.current = assistId;
        }
        setUi((p) => {
          const exists = p.chat.some((l) => l.id === assistId);
          const chat = exists
            ? p.chat.map((line) =>
                line.id === assistId
                  ? {
                      ...line,
                      text: `${line.text}${delta}`,
                      streaming: true,
                    }
                  : line
              )
            : [
                ...p.chat,
                {
                  id: assistId!,
                  role: "assistant" as const,
                  text: delta,
                  streaming: true,
                },
              ];
          return {
            ...p,
            chat,
            phase: "speaking",
            statusLabel: tRef.current.status.speaking,
          };
        });
        return;
      }

      const audioB64 = audioDeltaPayload(raw);
      if (audioB64) {
        // First packet → mute uplink immediately (also via setOnPlaying)
        if (!echoMuteRef.current) {
          echoMuteRef.current = true;
          echoMuteSinceRef.current = Date.now();
          sendRealtime({ type: "input_audio_buffer.clear" });
        }
        aiSpeakingRef.current = true;
        responseActiveRef.current = true;
        setUi((p) => ({
          ...p,
          phase: "speaking",
          statusLabel: tRef.current.status.speaking,
        }));
        void playbackRef.current?.enqueueBase64Pcm16(audioB64);
        return;
      }

      if (
        type === "response.audio_transcript.done" ||
        type === "response.output_audio_transcript.done"
      ) {
        const full = String(
          (raw as { transcript?: string; text?: string }).transcript ||
            (raw as { text?: string }).text ||
            ""
        ).trim();
        if (full) lastAssistantTextRef.current = full;
        const id = streamingAssistIdRef.current;
        if (id && full) {
          setUi((p) => ({
            ...p,
            chat: p.chat.map((line) =>
              line.id === id
                ? { ...line, text: full, streaming: false }
                : line
            ),
          }));
        }
        return;
      }

      if (type === "response.done" || type === "response.cancelled") {
        responseActiveRef.current = false;
        const id = streamingAssistIdRef.current;
        streamingAssistIdRef.current = null;

        // Keep a short rolling memory (trim only) so the next turn can continue
        purgeConversationHistory(null);

        // Recover missing user bubble text from response payload / conversation logs
        if (awaitingUserTranscriptRef.current || userLineIdRef.current) {
          const recovered = extractUserTranscriptFromEvent(raw);
          if (recovered && isWhisperHallucination(recovered)) {
            discardHallucinatedTurn(recovered);
          } else if (recovered) {
            fillUserTranscript(recovered);
          } else {
            // Still ensure something visible if Whisper never arrived
            setUi((p) => {
              const uid = userLineIdRef.current;
              if (!uid) return p;
              const line = p.chat.find((l) => l.id === uid);
              if (
                line &&
                (!line.text.trim() || line.text.trim() === "…" || line.streaming)
              ) {
                awaitingUserTranscriptRef.current = false;
                clearTranscriptFallbackTimer();
                return {
                  ...p,
                  chat: p.chat.map((l) =>
                    l.id === uid
                      ? {
                          ...l,
                          text: tRef.current.conversation.spokenPending,
                          streaming: false,
                        }
                      : l
                  ),
                };
              }
              return p;
            });
          }
        }

        if (id) {
          setUi((p) => ({
            ...p,
            chat: p.chat.map((line) =>
              line.id === id ? { ...line, streaming: false } : line
            ),
          }));
        }
        if (!playbackRef.current?.isPlaying) {
          aiSpeakingRef.current = false;
          aiIdleAtRef.current = Date.now();
          // Queue already empty — unmute now (same rule as onIdle)
          echoMuteRef.current = false;
          echoMuteSinceRef.current = 0;
          // Do not clear mic buffer — user may already be speaking
          setUi((p) => ({
            ...p,
            phase: voiceLiveRef.current ? "live" : p.phase,
            statusLabel: tRef.current.conversation.keepTalking,
          }));
        }
        return;
      }
    },
    [
      clearTranscriptFallbackTimer,
      clearReplySafetyTimer,
      discardHallucinatedTurn,
      ensureUserBubble,
      extractUserTranscriptFromEvent,
      fillUserTranscript,
      interruptAi,
      purgeConversationHistory,
      requestCompanionReply,
      sendRealtime,
    ]
  );

  const closeChatRef = useRef<(() => Promise<void>) | null>(null);

  const stopVoiceRealtime = useCallback(() => {
    voiceLiveRef.current = false;
    pcmMutedRef.current = true;
    echoMuteRef.current = false;
    clearTranscriptFallbackTimer();
    clearReplySafetyTimer();
    awaitingUserTranscriptRef.current = false;
    userLineIdRef.current = null;
    // Release hardware lock completely (stops all MediaStream tracks)
    captureRef.current?.stop();
    captureRef.current = null;
    releaseMicrophone("voice");
    releaseAllMicrophones();
    const ws = realtimeWsRef.current;
    realtimeWsRef.current = null;
    if (ws && ws.readyState <= WebSocket.OPEN) {
      try {
        ws.close(1000, "voice_stop");
      } catch {
        /* ignore */
      }
    }
    void playbackRef.current?.dispose();
    playbackRef.current = null;
    responseActiveRef.current = false;
    aiSpeakingRef.current = false;
    echoMuteSinceRef.current = 0;
  }, [clearReplySafetyTimer, clearTranscriptFallbackTimer]);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (sessionCreateRef.current) return sessionCreateRef.current;

    sessionCreateRef.current = (async () => {
      const session = await createSession({
        companion_id: companionIdRef.current,
        locale: localeRef.current,
      });
      sessionIdRef.current = session.session_id;
      setUi((p) => ({
        ...p,
        session,
        fsmState: session.current_state,
        connected: true,
      }));
      return session.session_id;
    })();

    try {
      return await sessionCreateRef.current;
    } finally {
      sessionCreateRef.current = null;
    }
  }, []);

  const closeChat = useCallback(async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    stopPlayback();
    stopVoiceRealtime();
    setUi((p) => ({
      ...p,
      micLive: false,
      userSpeaking: false,
      phase: "ready",
      statusLabel: tRef.current.conversation.chatClosed,
      errorMessage: null,
    }));
    closingRef.current = false;
  }, [stopPlayback, stopVoiceRealtime]);
  closeChatRef.current = closeChat;

  const startContinuousChat = useCallback(async () => {
    if (voiceLiveRef.current || startingRef.current) return;
    aliveRef.current = true;
    startingRef.current = true;
    const copy = tRef.current;

    stopPlayback();
    stopVoiceRealtime();
    // Destroy any leftover WebAudio / media before a fresh conversation
    silenceHmMedia("voice");
    releaseAllMicrophones();
    repliedItemIdRef.current = null;
    pendingReplyRef.current = null;
    conversationItemIdsRef.current.clear();
    lastAssistantTextRef.current = "";
    streamingAssistIdRef.current = null;
    userLineIdRef.current = null;
    awaitingUserTranscriptRef.current = false;
    firstSpeechAnchoredRef.current = false;
    responseActiveRef.current = false;
    aiSpeakingRef.current = false;
    echoMuteRef.current = false;
    echoMuteSinceRef.current = 0;
    aiIdleAtRef.current = 0;
    replyStartedForTurnRef.current = false;
    clearTranscriptFallbackTimer();
    clearReplySafetyTimer();

    // Fresh chat UI — do not call wipeCharacterSession (that would kill this start)
    try {
      sessionStorage.removeItem("hm-chat-cache");
      sessionStorage.removeItem("hm-realtime-cache");
    } catch {
      /* ignore */
    }
    const oldSession = sessionIdRef.current;
    sessionIdRef.current = null;
    if (oldSession) {
      void clearSessionHistory(oldSession);
      void closeSession(oldSession);
    }

    setUi((p) => ({
      ...p,
      starting: true,
      statusLabel: copy.conversation.openingMic,
      errorMessage: null,
      chat: [],
      userSpeaking: false,
      micLevel: 0,
    }));

    let micStream: MediaStream | null = null;

    try {
      // Android/Samsung: unlock audio in the same tap BEFORE getUserMedia
      const primed = new Audio();
      trackHmMedia(primed, "voice");
      try {
        primed.src =
          "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
        await primed.play();
        primed.pause();
      } catch {
        /* ignore */
      }

      try {
        // Exclusive lock: force-stops Instellingen microfoon-test / other listeners
        micStream = await requestMicrophoneStream({ owner: "voice" });
      } catch (err) {
        setUi((p) => ({
          ...p,
          phase: "error",
          micLive: false,
          starting: false,
          errorMessage: `${micErrorText(err)}\n\n${copy.errors.micBlockedHelp}`,
          statusLabel: copy.errors.micDenied,
        }));
        return;
      }

      const playback = new PcmPlaybackQueue();
      // HARDWARE MUTE: deaf the backend the exact moment AI audio starts
      playback.setOnPlaying(() => {
        echoMuteRef.current = true;
        echoMuteSinceRef.current = Date.now();
        aiSpeakingRef.current = true;
        sendRealtime({ type: "input_audio_buffer.clear" });
        console.log("[hm-mute] mic uplink PAUSED (AI playing)");
      });
      // Streaming lip energy — same continuous face, mouth follows live PCM
      playback.setOnAmplitude((level) => {
        setUi((p) =>
          Math.abs(p.speechLevel - level) < 0.03
            ? p
            : { ...p, speechLevel: level }
        );
      });
      // Resume mic only when the AI playback queue is completely empty
      playback.setOnIdle(() => {
        aiSpeakingRef.current = false;
        aiIdleAtRef.current = Date.now();
        echoMuteRef.current = false;
        echoMuteSinceRef.current = 0;
        console.log("[hm-mute] mic uplink RESUMED (queue empty)");
        setUi((p) =>
          p.speechLevel === 0 ? p : { ...p, speechLevel: 0 }
        );
        if (voiceLiveRef.current) {
          setUi((p) => ({
            ...p,
            phase: "live",
            statusLabel: tRef.current.conversation.keepTalking,
          }));
        }
        const pending = pendingReplyRef.current;
        if (pending?.text) {
          pendingReplyRef.current = null;
          console.log("[hm-voice] flush queued reply after idle", pending.text);
          window.setTimeout(() => {
            requestCompanionReply(pending.text, pending.itemId);
          }, 120);
        }
      });
      playbackRef.current = playback;
      await playback.ensureContext();

      const connectRealtime = () =>
        new Promise<WebSocket>((resolve, reject) => {
          const wsUrl = realtimeWsUrl({
            companionId: companionIdRef.current,
            locale: localeRef.current,
          });
          console.log("[hm-realtime] connecting", wsUrl);
          const ws = new WebSocket(wsUrl);
          const timer = window.setTimeout(() => {
            try {
              ws.close();
            } catch {
              /* ignore */
            }
            reject(new Error("realtime_timeout"));
          }, 15_000);
          ws.onopen = () => {
            window.clearTimeout(timer);
            resolve(ws);
          };
          ws.onerror = () => {
            window.clearTimeout(timer);
            reject(new Error("realtime_ws_failed"));
          };
        });

      let ws: WebSocket;
      try {
        ws = await connectRealtime();
      } catch {
        // One retry — first attempt often races with page load / HMR
        await new Promise((r) => setTimeout(r, 400));
        ws = await connectRealtime();
      }
      realtimeWsRef.current = ws;

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
          handleRealtimeEvent(msg);
        } catch {
          /* ignore non-JSON */
        }
      };
      ws.onclose = () => {
        if (!voiceLiveRef.current) return;
        setUi((p) => ({
          ...p,
          connected: false,
          errorMessage:
            "Spraakverbinding verbroken. Klik Uit en daarna weer Aan.",
        }));
      };

      // Configure companion persona + speak in the selected website language
      ws.send(
        JSON.stringify(
          buildSessionUpdate({
            companionId: companionIdRef.current,
            locale: localeRef.current,
          })
        )
      );
      // Second pass — lock language / Whisper to UI locale
      ws.send(
        JSON.stringify(
          buildLanguageLockUpdate({
            companionId: companionIdRef.current,
            locale: localeRef.current,
          })
        )
      );
      // Wipe any residual uplink buffer from a prior maatje session
      ws.send(JSON.stringify({ type: "input_audio_buffer.clear" }));

      pcmMutedRef.current = false;
      voiceLiveRef.current = true;
      firstSpeechAnchoredRef.current = false;
      repliedItemIdRef.current = null;
      replyStartedForTurnRef.current = false;
      awaitingUserTranscriptRef.current = false;
      userLineIdRef.current = null;
      clearTranscriptFallbackTimer();
      clearReplySafetyTimer();

      const capture = await startPcmCapture(micStream, (pcm, rms) => {
        if (!voiceLiveRef.current || pcmMutedRef.current) return;
        const wsLive = realtimeWsRef.current;
        if (!wsLive || wsLive.readyState !== WebSocket.OPEN) return;

        // Always show mic activity (even while muted for echo)
        setUi((p) =>
          Math.abs(p.micLevel - rms) < 0.8 ? p : { ...p, micLevel: rms }
        );

        // Safety: never leave echoMute stuck (playback idle missed → Fenna frozen)
        if (
          echoMuteRef.current &&
          echoMuteSinceRef.current > 0 &&
          Date.now() - echoMuteSinceRef.current > 8000 &&
          !playbackRef.current?.isPlaying
        ) {
          console.warn("[hm-stt] echoMute watchdog — force unmute");
          echoMuteRef.current = false;
          echoMuteSinceRef.current = 0;
          aiSpeakingRef.current = false;
        }

        // Local barge-in: while uplink is paused, quiet table speech still counts
        if (echoMuteRef.current) {
          if (rms >= 12) {
            console.log("[hm-mute] local barge-in rms=", rms);
            interruptAi();
            echoMuteRef.current = false;
            echoMuteSinceRef.current = 0;
            aiSpeakingRef.current = false;
            // fall through — start uplinking this frame
          } else {
            return;
          }
        }

        // Always stream PCM (incl. silence) so server VAD can start/stop turns
        wsLive.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: arrayBufferToBase64(pcm),
          })
        );
      });
      captureRef.current = capture;
      micStream = null;

      // Optional Python session for typed-chat speak fallback / analytics
      void ensureSession().catch(() => undefined);

      setUi((p) => ({
        ...p,
        phase: "live",
        micLive: true,
        starting: false,
        connected: true,
        statusLabel: copy.conversation.keepTalking,
        // Soft conversation seed (UI only) — warm start, not a fake Ollama memory hack
        chat: [
          {
            id: `seed-${companionIdRef.current}`,
            role: "assistant" as const,
            text: getCompanionIntro(
              companionIdRef.current,
              localeRef.current
            ),
            streaming: false,
          },
        ],
      }));
    } catch (err) {
      stopVoiceRealtime();
      if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
        micStream = null;
      }
      releaseMicrophone("voice");
      setUi((p) => ({
        ...p,
        phase: "error",
        micLive: false,
        starting: false,
        errorMessage: isMicPermissionError(err)
          ? `${micErrorText(err)}\n\n${copy.errors.micBlockedHelp}`
          : "Spraak (OpenAI Realtime) start niet. Herlaad de pagina of klik Aan opnieuw.\n\nTip: server moet `node server.mjs` draaien (poort 3010 + 3011).",
        statusLabel: isMicPermissionError(err)
          ? copy.errors.micDenied
          : copy.status.error,
      }));
    } finally {
      startingRef.current = false;
      setUi((p) => (p.starting ? { ...p, starting: false } : p));
    }
  }, [
    clearReplySafetyTimer,
    clearTranscriptFallbackTimer,
    ensureSession,
    handleRealtimeEvent,
    interruptAi,
    requestCompanionReply,
    sendRealtime,
    stopPlayback,
    stopVoiceRealtime,
  ]);

  useEffect(() => {
    if (!i18nReady) return;
    setUi((p) => ({
      ...p,
      phase: "ready",
      connected: true,
      statusLabel: tRef.current.status.ready,
    }));
  }, [i18nReady]);

  // Locale change: refresh Realtime instructions; keep Ollama session in sync for text mode
  useEffect(() => {
    if (!i18nReady) return;
    // Keep the warm seed bubble in the selected website language
    const seedId = `seed-${companionIdRef.current}`;
    const intro = getCompanionIntro(companionIdRef.current, locale);
    setUi((p) => {
      if (!p.chat.some((line) => line.id === seedId)) return p;
      return {
        ...p,
        chat: p.chat.map((line) =>
          line.id === seedId ? { ...line, text: intro } : line
        ),
      };
    });
    if (voiceLiveRef.current && realtimeWsRef.current?.readyState === WebSocket.OPEN) {
      sendRealtime(
        buildSessionUpdate({
          companionId: companionIdRef.current,
          locale,
        })
      );
      sendRealtime(
        buildLanguageLockUpdate({
          companionId: companionIdRef.current,
          locale,
        })
      );
    }
    const id = sessionIdRef.current;
    if (!id) return;
    void patchSessionLocale(id, locale)
      .then((session) => {
        setUi((p) => ({ ...p, session }));
      })
      .catch(() => {
        sessionIdRef.current = null;
      });
  }, [locale, i18nReady, sendRealtime]);

  /**
   * Text-only messaging → Ollama via `/api/chat` (unchanged).
   * Does not use the Realtime voice WebSocket.
   */
  const sendTypedMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      const copy = tRef.current;

      // Pause mic uplink while typed turn runs (voice layer stays connected)
      const wasVoice = voiceLiveRef.current;
      if (wasVoice) {
        pcmMutedRef.current = true;
        interruptAi();
      }

      let sessionId = sessionIdRef.current;
      try {
        if (!sessionId) sessionId = await ensureSession();
      } catch {
        setUi((p) => ({ ...p, errorMessage: copy.errors.noServer }));
        if (wasVoice) pcmMutedRef.current = false;
        return;
      }

      const userId = `u-${Date.now()}`;
      const assistId = `a-stream-${Date.now()}`;
      streamingAssistIdRef.current = assistId;
      let priorChat: ChatLine[] = [];
      setUi((p) => {
        priorChat = p.chat;
        return {
          ...p,
          phase: "thinking",
          statusLabel: copy.conversation.processingVoice,
          errorMessage: null,
          chat: [
            ...p.chat,
            { id: userId, role: "user", text },
            { id: assistId, role: "assistant", text: "", streaming: true },
          ],
        };
      });

      const history = priorChat
        .filter((line) => line.text.trim())
        .map((line) => ({
          role: line.role,
          content: line.text,
        }))
        .slice(-12);

      try {
        const ttsSafety = window.setTimeout(() => {
          if (wasVoice) pcmMutedRef.current = false;
          setUi((p) => ({
            ...p,
            phase: wasVoice ? "live" : "ready",
            statusLabel: copy.conversation.keepTalking,
          }));
        }, 20_000);

        const finalText = await streamChat(
          sessionId,
          text,
          {
            onToken: (full) => {
              flushSync(() => {
                setUi((p) => ({
                  ...p,
                  phase: "live",
                  statusLabel: copy.conversation.keepTalking,
                  chat: p.chat.map((line) =>
                    line.id === assistId
                      ? { ...line, text: full, streaming: true }
                      : line
                  ),
                }));
              });
            },
            onFinal: (full) => {
              flushSync(() => {
                setUi((p) => ({
                  ...p,
                  chat: p.chat.map((line) =>
                    line.id === assistId
                      ? { ...line, text: full, streaming: false }
                      : line
                  ),
                  phase: "speaking",
                  statusLabel: copy.status.speaking,
                }));
              });
            },
            onAudio: (b64, mime) => {
              window.clearTimeout(ttsSafety);
              // Continuous Realtime already owns voice — never play a second HTMLAudioElement
              if (voiceLiveRef.current || playbackRef.current?.isPlaying) {
                if (wasVoice) pcmMutedRef.current = false;
                setUi((p) => ({
                  ...p,
                  phase: wasVoice ? "live" : "ready",
                  statusLabel: copy.conversation.keepTalking,
                }));
                return;
              }
              if (!b64 || !mime) {
                if (wasVoice) pcmMutedRef.current = false;
                setUi((p) => ({
                  ...p,
                  phase: wasVoice ? "live" : "ready",
                  statusLabel: copy.conversation.keepTalking,
                }));
                return;
              }
              stopPlayback();
              void playAudioAndWait(b64, mime)
                .catch(() => undefined)
                .finally(() => {
                  if (wasVoice) pcmMutedRef.current = false;
                  setUi((p) => ({
                    ...p,
                    phase: wasVoice ? "live" : "ready",
                    statusLabel: copy.conversation.keepTalking,
                  }));
                });
            },
          },
          {
            companionId: companionIdRef.current,
            locale: localeRef.current,
            messages: history,
          }
        );

        if (finalText) {
          setUi((p) => ({
            ...p,
            chat: p.chat.map((line) =>
              line.id === assistId
                ? { ...line, text: finalText, streaming: false }
                : line
            ),
          }));
        }
      } catch {
        setUi((p) => ({
          ...p,
          errorMessage: copy.errors.noServer,
          phase: wasVoice ? "live" : "ready",
          chat: p.chat.map((line) =>
            line.id === assistId ? { ...line, streaming: false } : line
          ),
        }));
        if (wasVoice) pcmMutedRef.current = false;
      } finally {
        streamingAssistIdRef.current = null;
      }
    },
    [ensureSession, interruptAi, stopPlayback]
  );

  const tearDownSession = useCallback(() => {
    aliveRef.current = false;
    startingRef.current = false;
    stopPlayback();
    stopVoiceRealtime();
    const id = sessionIdRef.current;
    sessionIdRef.current = null;
    if (id) void closeSession(id);
  }, [stopPlayback, stopVoiceRealtime]);

  /** Hard isolate each maatje: kill WS, wipe buffers, wipe chat history. */
  const wipeCharacterSession = useCallback(() => {
    aliveRef.current = false;
    startingRef.current = false;
    clearTranscriptFallbackTimer();
    clearReplySafetyTimer();
    awaitingUserTranscriptRef.current = false;
    userLineIdRef.current = null;
    repliedItemIdRef.current = null;
    firstSpeechAnchoredRef.current = false;
    streamingAssistIdRef.current = null;
    lastAssistantTextRef.current = "";
    conversationItemIdsRef.current.clear();
    pendingReplyRef.current = null;
    responseActiveRef.current = false;
    aiSpeakingRef.current = false;
    echoMuteRef.current = false;
    echoMuteSinceRef.current = 0;
    aiIdleAtRef.current = 0;
    replyStartedForTurnRef.current = false;
    stopPlayback();
    // Clear any in-flight uplink before closing the socket
    const ws = realtimeWsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "response.cancel" }));
        ws.send(JSON.stringify({ type: "input_audio_buffer.clear" }));
      } catch {
        /* ignore */
      }
    }
    stopVoiceRealtime();
    const id = sessionIdRef.current;
    sessionIdRef.current = null;
    if (id) {
      void clearSessionHistory(id);
      void closeSession(id);
    }
    try {
      sessionStorage.removeItem("hm-chat-cache");
      sessionStorage.removeItem("hm-realtime-cache");
    } catch {
      /* ignore */
    }
    setUi((p) => ({
      ...p,
      chat: [],
      micLive: false,
      userSpeaking: false,
      micLevel: 0,
      starting: false,
      phase: "ready",
      connected: true,
      errorMessage: null,
      statusLabel: tRef.current.status.ready,
      session: null,
      fsmState: "IDLE",
      avatarVideoUrl: null,
      speechLevel: 0,
    }));
  }, [
    clearReplySafetyTimer,
    clearTranscriptFallbackTimer,
    stopPlayback,
    stopVoiceRealtime,
  ]);

  const prevCompanionRef = useRef<CompanionId | null>(null);
  const wipeRef = useRef(wipeCharacterSession);
  wipeRef.current = wipeCharacterSession;

  useEffect(() => {
    companionIdRef.current = companionId;
    const prev = prevCompanionRef.current;
    // Only wipe when switching characters — never on callback identity churn
    if (prev && prev !== companionId) {
      console.log(
        "[hm-realtime] character switch — wipe session",
        prev,
        "→",
        companionId
      );
      wipeRef.current();
    }
    prevCompanionRef.current = companionId;
  }, [companionId]);

  // Tear down only when leaving this companion page (or switching id)
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      tearDownSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- companionId scoped teardown only
  }, [companionId]);

  return {
    ui,
    startContinuousChat,
    closeChat,
    interrupt: interruptAi,
    sendTypedMessage,
    clearHistory: wipeCharacterSession,
  };
}

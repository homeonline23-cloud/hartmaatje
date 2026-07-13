"use client";

import { useCallback, useRef } from "react";
import { ContinuousListener } from "@/lib/fenna-voice/continuousListener";
import { playFennaAudio, stopFennaAudio, blobToBase64, unlockAudioPlayback } from "@/lib/fenna-voice/playback";
import { speakFennaLine } from "@/lib/fenna-voice/speakFennaLine";
import {
  FENNA_OPENING,
  hartmaatjeApi,
  type AppLang,
  type FennaMessage,
} from "@/lib/hartmaatje-api/client";
import { normalizeCoreLang } from "@/lib/languages";

export type BatchVoiceCallbacks = {
  onPhase: (phase: "listening" | "thinking" | "speaking") => void;
  onMessages: (fn: (prev: FennaMessage[]) => FennaMessage[]) => void;
  onError: (msg: string) => void;
};

export function useBatchVoice(callbacks: BatchVoiceCallbacks) {
  const sessionIdRef = useRef<string | null>(null);
  const listenerRef = useRef<ContinuousListener | null>(null);
  const langRef = useRef<AppLang>("nl");

  const stop = useCallback(async () => {
    listenerRef.current?.stop();
    listenerRef.current = null;
    stopFennaAudio();
    const sid = sessionIdRef.current;
    if (sid) await hartmaatjeApi.endSession(sid).catch(() => {});
    sessionIdRef.current = null;
  }, []);

  const onUtterance = useCallback(
    async (blob: Blob) => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      callbacks.onPhase("thinking");
      listenerRef.current?.pause();

      try {
        const base64 = await blobToBase64(blob);
        const res = await hartmaatjeApi.voiceTurn(
          sid,
          base64,
          blob.type || "audio/webm",
          langRef.current,
          "complete",
        );

        callbacks.onMessages((prev) => [
          ...prev,
          { id: `u-${Date.now()}`, role: "user", content: res.user_text },
          { id: `a-${Date.now()}`, role: "assistant", content: res.reply },
        ]);

        callbacks.onPhase("speaking");
        if (res.quick_ack_audio_base64 && res.quick_ack_mime_type) {
          await playFennaAudio(res.quick_ack_audio_base64, res.quick_ack_mime_type);
        }
        await playFennaAudio(res.audio_base64, res.mime_type);

        listenerRef.current?.resume();
        callbacks.onPhase("listening");
      } catch (err) {
        callbacks.onError(
          err instanceof Error ? err.message : "Spraak mislukt",
        );
        listenerRef.current?.resume();
        callbacks.onPhase("listening");
      }
    },
    [callbacks],
  );

  const start = useCallback(
    async (lang: AppLang) => {
      langRef.current = lang;
      await unlockAudioPlayback();

      const health = await hartmaatjeApi.health().catch(() => null);
      if (!health?.fenna_ready) {
        throw new Error(
          "Start de HartMaatje-server: cd backend && .venv\\Scripts\\uvicorn app.main:app --reload --port 8000",
        );
      }

      const residentId =
        typeof window !== "undefined"
          ? localStorage.getItem("hartmaatje_resident") ?? "guest"
          : "guest";
      const res = await hartmaatjeApi.startSession(residentId, lang);
      sessionIdRef.current = res.session_id;

      callbacks.onMessages(() => [
        {
          id: "opening",
          role: "assistant",
          content: FENNA_OPENING[normalizeCoreLang(lang)],
        },
      ]);

      callbacks.onPhase("speaking");
      try {
        await speakFennaLine(FENNA_OPENING[normalizeCoreLang(lang)], normalizeCoreLang(lang));
      } catch {
        const openingAudio = await hartmaatjeApi.speak(
          res.session_id,
          FENNA_OPENING[normalizeCoreLang(lang)],
          lang,
        );
        await playFennaAudio(openingAudio.audio_base64, openingAudio.mime_type);
      }

      const listener = new ContinuousListener({
        onUtterance,
        onUserStartsSpeaking: stopFennaAudio,
      });
      listenerRef.current = listener;
      await listener.start();
      callbacks.onPhase("listening");
    },
    [callbacks, onUtterance],
  );

  return { start, stop };
}

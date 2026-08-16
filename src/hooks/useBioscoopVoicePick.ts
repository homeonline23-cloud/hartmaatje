"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toBcp47, type AppLang } from "@/i18n/config";
import { resolveApiBase } from "@/lib/apiHost";
import { ContinuousListener } from "@/lib/continuousListener";
import { openMicrophoneHardware } from "@/lib/micAccess";
import {
  isMobileDevice,
  registerMicrophoneStream,
  releaseAllMicrophones,
  releaseMicrophoneOwner,
} from "@/lib/micExclusive";

function extFor(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

/** POSTs one recorded utterance to HartMaatje's own local STT (`apps/api` →
 * `services/fw-stt`, self-hosted faster-whisper) — no Google, no OpenAI, no
 * per-request billing. */
async function transcribeClip(
  blob: Blob,
  mimeType: string,
  locale: string
): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, `wish.${extFor(mimeType)}`);
  form.append("mime_type", mimeType);
  form.append("locale", locale);

  const url = `${resolveApiBase()}/transcribe`;
  console.log("[bioscoop-mic] POST", url, { bytes: blob.size, mimeType, locale });
  const res = await fetch(url, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`transcribe_failed_${res.status}`);
  const data = (await res.json()) as { ok?: boolean; text?: string };
  console.log("[bioscoop-mic] transcribe result", data);
  return (data.text || "").trim();
}

/**
 * Always-on, listen-only speech-to-text for Bioscoop Kamer voice picking.
 *
 * Deliberately independent of Chrome's built-in `SpeechRecognition` (which
 * depends on Google's speech servers and turned out to be unreachable on
 * this network) and of OpenAI. Instead it records each spoken utterance with
 * `ContinuousListener` — the same VAD/recorder HartMaatje already uses — and
 * transcribes it via the self-hosted local Whisper API, matching the
 * "own server, no third-party billing" architecture the rest of the app uses.
 */
export function useBioscoopVoicePick(
  lang: AppLang,
  onWish: (transcript: string) => void
) {
  const [micLive, setMicLive] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [unsupported, setUnsupported] = useState(false);

  const listenerRef = useRef<ContinuousListener | null>(null);
  const liveRef = useRef(false);
  const onWishRef = useRef(onWish);
  const langRef = useRef(lang);
  useLayoutEffect(() => {
    onWishRef.current = onWish;
    langRef.current = lang;
  });
  const failuresRef = useRef(0);
  /** Bumped by stop()/start() so a stale async step (mic-release delay,
   * getUserMedia prompt, in-flight transcription) can detect it was
   * cancelled and back off instead of reviving a dead session. */
  const generationRef = useRef(0);

  const stop = useCallback(() => {
    generationRef.current += 1;
    liveRef.current = false;
    listenerRef.current?.stop();
    listenerRef.current = null;
    releaseMicrophoneOwner("other");
    setMicLive(false);
    setUserSpeaking(false);
    setMicLevel(0);
  }, []);

  const start = useCallback(async () => {
    console.log("[bioscoop-mic] start() called");
    if (liveRef.current) return;
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      console.log("[bioscoop-mic] unsupported: no getUserMedia/MediaRecorder");
      setUnsupported(true);
      return;
    }

    const myGeneration = ++generationRef.current;
    setUnsupported(false);
    setTranscript("");
    failuresRef.current = 0;

    // Safari/iOS: open the mic in the same tap-stack BEFORE any await delay.
    // Windows: free other holders first, then a short gap if needed.
    let stream: MediaStream;
    try {
      if (isMobileDevice()) {
        // Free others, then open immediately — no timer (kills the tap gesture).
        releaseAllMicrophones();
        stream = await openMicrophoneHardware();
      } else {
        releaseAllMicrophones();
        await new Promise((r) => setTimeout(r, 150));
        if (generationRef.current !== myGeneration) return;
        stream = await openMicrophoneHardware();
      }
    } catch (err) {
      console.warn("[bioscoop-mic] getUserMedia failed", err);
      setUnsupported(true);
      return;
    }
    if (generationRef.current !== myGeneration) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    registerMicrophoneStream(stream, "other");

    const listener = new ContinuousListener({
      onListeningChange: (live) => {
        console.log("[bioscoop-mic] listening change", live);
        setMicLive(live);
      },
      onSpeakingChange: (speaking) => {
        console.log("[bioscoop-mic] speaking change", speaking);
        setUserSpeaking(speaking);
      },
      onMicLevel: setMicLevel,
      onUtterance: async (blob, mimeType) => {
        console.log("[bioscoop-mic] utterance captured", {
          bytes: blob.size,
          mimeType,
        });
        if (generationRef.current !== myGeneration) return;
        try {
          const text = await transcribeClip(
            blob,
            mimeType,
            toBcp47(langRef.current)
          );
          if (generationRef.current !== myGeneration) return;
          failuresRef.current = 0;
          if (text) {
            setTranscript(text);
            onWishRef.current(text);
          }
        } catch (err) {
          console.warn("[bioscoop-mic] transcribe failed", err);
          if (generationRef.current !== myGeneration) return;
          failuresRef.current += 1;
          // Local API/STT unreachable a few times in a row — stop pretending
          // to listen and point the resident back to the button grid.
          if (failuresRef.current >= 3) {
            setUnsupported(true);
            stop();
          }
        }
      },
    });

    listenerRef.current = listener;
    try {
      await listener.start(stream);
      console.log("[bioscoop-mic] listener.start() resolved ok");
    } catch (err) {
      console.warn("[bioscoop-mic] listener.start() failed", err);
      releaseMicrophoneOwner("other");
      listenerRef.current = null;
      setUnsupported(true);
      return;
    }
    if (generationRef.current !== myGeneration) {
      listener.stop();
      releaseMicrophoneOwner("other");
      listenerRef.current = null;
      return;
    }
    liveRef.current = true;
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { micLive, userSpeaking, micLevel, transcript, unsupported, start, stop };
}

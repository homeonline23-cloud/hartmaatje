"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BackToSettingsLink } from "@/components/BackToSettingsLink";
import { MicGlyph } from "@/components/MicWindow";
import {
  micErrorText,
  requestMicrophoneStream,
} from "@/lib/micAccess";
import {
  isVoiceSessionMicActive,
  subscribeMicLock,
} from "@/lib/micExclusive";

/**
 * Isolated Chrome mic check — no API / TTS needed.
 * Yields the hardware lock when a voice conversation claims the mic.
 */
export function MicTestPanel() {
  const [status, setStatus] = useState<string>(
    "Klik op «Test microfoon» hieronder"
  );
  const [perm, setPerm] = useState<string>("onbekend");
  const [deviceLabel, setDeviceLabel] = useState<string>("—");
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [silentHint, setSilentHint] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const peakRef = useRef(0);
  const startedAtRef = useRef(0);

  const refreshPerm = useCallback(async () => {
    try {
      const p = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      setPerm(p.state);
      p.onchange = () => setPerm(p.state);
    } catch {
      setPerm("niet-ondersteund (klik Test)");
    }
  }, []);

  const stop = useCallback((msg?: string) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);
    setLevel(0);
    setStatus(msg || "Gestopt — klik opnieuw op Test microfoon");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshPerm();
    const unsub = subscribeMicLock((ev) => {
      if (ev.reason === "voice_claim" || ev.reason === "force_stop") {
        stop(
          "Gestopt: gesprek heeft de microfoon overgenomen. Sluit het gesprek (Uit) om opnieuw te testen."
        );
      }
    });
    return () => {
      unsub();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      void ctxRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [refreshPerm, stop]);

  const start = useCallback(async () => {
    setError(null);
    setSilentHint(null);
    setPeak(0);
    peakRef.current = 0;
    setStatus("Browser vraagt om microfoon…");

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);

    if (isVoiceSessionMicActive()) {
      setError(
        "Gesprek is actief. Klik eerst «Uit» bij Fenna, daarna pas de microfoon-test."
      );
      setStatus("Mislukt");
      return;
    }

    try {
      const stream = await requestMicrophoneStream({ owner: "mic-test" });
      streamRef.current = stream;
      const track = stream.getAudioTracks()[0];
      const label = track?.label || "Onbekend apparaat";
      setDeviceLabel(label);
      console.log("[hm-mic-test] track", {
        label,
        enabled: track?.enabled,
        muted: track?.muted,
        readyState: track?.readyState,
        settings: track?.getSettings?.(),
      });

      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      // Native rate — do not force 24000 (can be silent on Windows)
      const ctx = new Ctx();
      ctxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      startedAtRef.current = performance.now();

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i]! - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length) * 100;
        if (rms > peakRef.current) {
          peakRef.current = rms;
          setPeak(rms);
        }
        setLevel(rms);

        const elapsed = performance.now() - startedAtRef.current;
        if (elapsed > 2500 && peakRef.current < 1.5) {
          setSilentHint(
            "Geen geluid gedetecteerd. Controleer: Windows Instellingen → Systeem → Geluid → Invoer (juiste microfoon, niet gedempt). Sluit Zoom/Teams. Praat harder dicht bij de mic."
          );
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      setLive(true);
      setStatus("MICROFOON AAN — praat nu; de groene balk moet bewegen");
      void refreshPerm();
    } catch (err) {
      setLive(false);
      setError(micErrorText(err));
      setStatus("Mislukt");
      void refreshPerm();
    }
  }, [refreshPerm]);

  const bar = Math.min(100, Math.round(level * 5));

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-[#e8dfd0] bg-white/90 p-5 text-center text-[#3f6339] shadow-md">
      <header className="relative flex items-start justify-between gap-3 text-left">
        <h1 className="min-w-0 flex-1 text-center text-2xl font-bold text-[#3f6339]">
          Microfoon-test
        </h1>
        <div className="shrink-0">
          <BackToSettingsLink />
        </div>
      </header>
      <p className="text-base leading-relaxed">
        Alleen in <strong>Chrome of Edge</strong> op{" "}
        <strong>hartmaatje.app</strong> — niet in het Cursor-venster.
        Stop deze test vóór een gesprek met uw maatje.
      </p>
      <p className="rounded-xl bg-[#f5f0e6] px-3 py-2 text-sm">
        Chrome-status microfoon: <strong>{perm}</strong>
        {perm === "granted" ? (
          <>
            <br />
            Toestemming is OK — klik nu op <strong>Test microfoon</strong>.
          </>
        ) : null}
        {perm === "denied" ? (
          <>
            <br />
            Slotje links in de adresbalk → Microfoon → <strong>Toestaan</strong>{" "}
            → pagina herladen.
          </>
        ) : null}
      </p>
      <p className="text-sm">
        Apparaat: <strong>{deviceLabel}</strong>
        {live ? (
          <>
            {" "}
            · piek {Math.round(peak * 10) / 10}
          </>
        ) : null}
      </p>
      <p className="text-lg font-semibold">{status}</p>
      {error ? (
        <p className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-red-900">
          {error}
        </p>
      ) : null}
      {silentHint ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-950">
          {silentHint}
        </p>
      ) : null}

      <div className="h-4 overflow-hidden rounded-full bg-[#e8dfd0]">
        <div
          className="h-full rounded-full bg-[#3f6339] transition-[width] duration-75"
          style={{ width: `${bar}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => void start()}
          className="hm-dark flex items-center gap-2 rounded-2xl px-5 py-3 text-lg font-bold"
        >
          <MicGlyph className="h-6 w-6" />
          Test microfoon
        </button>
        {live ? (
          <button
            type="button"
            onClick={() => stop()}
            className="rounded-2xl bg-[#8b3a2a] px-5 py-3 text-lg font-bold text-white"
          >
            Stop
          </button>
        ) : null}
      </div>
    </div>
  );
}

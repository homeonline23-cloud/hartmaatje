"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  normalizePresetId,
  TTS_RATE_STEPS,
  VOICE_PRESETS,
  type VoicePresetId,
} from "@/lib/constants";
import { speakDutch } from "@/lib/tts";
import { AppPagePanel } from "@/components/AppPagePanel";
import { Card, ErrorBanner, PrimaryButton, TextField } from "@/components/ui";

function rateCaption(step: number): string {
  if (Math.abs(step - TTS_RATE_STEPS[0]) < 1e-3) return "Rustig";
  if (Math.abs(step - TTS_RATE_STEPS[2]) < 1e-3) return "Iets sneller";
  return "Standaard";
}

export default function InstellingenPage() {
  const { user, profile, updateProfileFields, refreshProfile } = useAuth();

  const [name, setName] = useState("");
  const [formal, setFormal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setFormal(profile.address_form !== "informeel");
  }, [profile?.address_form, profile?.display_name, profile?.id]);

  const currentPreset = normalizePresetId(profile?.tts_preset_id);
  const currentPlayback = profile?.tts_playback_rate ?? 1.06;
  const rateStepHighlight = TTS_RATE_STEPS.reduce(
    (best, step) =>
      Math.abs(step - currentPlayback) < Math.abs(best - currentPlayback)
        ? step
        : best,
    TTS_RATE_STEPS[1],
  );

  const onSaveProfile = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await updateProfileFields({
      display_name: name,
      address_form: formal ? "formeel" : "informeel",
    });
    setBusy(false);
    if (res.error) setError(res.error);
    else setMessage("Profiel opgeslagen.");
  };

  const onPickPreset = async (id: VoicePresetId) => {
    setBusy(true);
    setError(null);
    const res = await updateProfileFields({ tts_preset_id: id });
    setBusy(false);
    if (res.error) setError(res.error);
    else {
      setMessage("Stem gekozen voor voorlezen.");
      speakDutch("Zo klinkt deze stem. Fijn dat u er bent.", {
        preset: id,
        rate: currentPlayback,
      });
    }
  };

  const onPickRate = async (rate: number) => {
    setBusy(true);
    setError(null);
    const res = await updateProfileFields({ tts_playback_rate: rate });
    setBusy(false);
    if (res.error) setError(res.error);
    else {
      setMessage(`Voorleestempo op ${Math.round(rate * 100)} % gezet.`);
      speakDutch("Dit is het gekozen tempo.", {
        preset: currentPreset,
        rate,
      });
    }
  };

  return (
    <AppPagePanel
      title="Instellingen"
      intro="Uw profiel. Spraak: opname wordt enkel gebruikt voor omzetting naar tekst; voorlezen gaat via de stemmen van uw browser (vier keuzestanden)."
    >
      <Card>
        <h2 className="text-lg font-semibold text-[#2c2416]">Uw e-mail</h2>
        <p className="mb-4 text-lg text-[#5c4a32]">{user?.email ?? "—"}</p>

        <TextField label="Naam (optioneel)" value={name} onChange={setName} />

        <p className="mb-2 mt-4 text-lg font-medium text-[#2c2416]">
          Aanspreekvorm
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFormal(true)}
            className={`flex-1 rounded-2xl border-2 px-4 py-3 text-lg ${
              formal
                ? "border-[#4a6741] bg-[#4a6741] font-semibold text-white"
                : "border-[#d8ccb8] bg-white text-[#2c2416]"
            }`}
          >
            U (formeel)
          </button>
          <button
            type="button"
            onClick={() => setFormal(false)}
            className={`flex-1 rounded-2xl border-2 px-4 py-3 text-lg ${
              !formal
                ? "border-[#4a6741] bg-[#4a6741] font-semibold text-white"
                : "border-[#d8ccb8] bg-white text-[#2c2416]"
            }`}
          >
            Jij (informeel)
          </button>
        </div>

        <div className="mt-4">
          <PrimaryButton
            label={busy ? "Bezig…" : "Profiel opslaan"}
            disabled={busy}
            onClick={() => void onSaveProfile()}
          />
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold text-[#2c2416]">
          Voorlezen (tekst-naar-spraak)
        </h2>
        <p className="mb-3 text-base text-[#5c4a32]">
          Kies een van vier stemmen. Welke stemmen beschikbaar zijn hangt af van
          uw browser; we proberen automatisch Nederlandse stemmen te vinden.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {VOICE_PRESETS.map((p) => {
            const sel = currentPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => void onPickPreset(p.id)}
                className={`rounded-2xl border-2 p-4 text-left ${
                  sel
                    ? "border-[#4a6741] bg-[#eef3ea]"
                    : "border-[#d8ccb8] bg-white"
                }`}
              >
                <span className="block font-bold text-[#2c2416]">
                  {p.headline}
                </span>
                <span className="mt-1 block text-sm text-[#5c4a32]">
                  {p.sub}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mb-2 mt-4 text-lg font-medium text-[#2c2416]">
          Tempo bij voorlezen
        </p>
        <div className="flex flex-wrap gap-2">
          {TTS_RATE_STEPS.map((step) => {
            const hl = Math.abs(rateStepHighlight - step) < 0.015;
            return (
              <button
                key={step}
                type="button"
                onClick={() => void onPickRate(step)}
                className={`flex-1 rounded-2xl border-2 px-3 py-3 text-base ${
                  hl
                    ? "border-[#4a6741] bg-[#4a6741] font-semibold text-white"
                    : "border-[#d8ccb8] bg-white text-[#2c2416]"
                }`}
              >
                {`${rateCaption(step)} (${Math.round(step * 100)} %)`}
              </button>
            );
          })}
        </div>
      </Card>

      <ErrorBanner message={error} />
      {message ? (
        <p className="rounded-xl border-2 border-[#4a6741]/40 bg-[#eef3ea] px-4 py-3 text-lg text-[#3d5636]">
          {message}
        </p>
      ) : null}

      <PrimaryButton
        label="Van server laden"
        variant="outline"
        onClick={() => void refreshProfile()}
      />
    </AppPagePanel>
  );
}

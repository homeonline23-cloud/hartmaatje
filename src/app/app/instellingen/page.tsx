"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { getVoiceSpeedLabel } from "@/lib/appLocale";
import {
  defaultVoiceSettings,
  getVoiceIdentity,
  loadLocalVoiceSettings,
  nearestVoiceSpeedStep,
  previewHartMaatjeVoice,
  resolveVoiceSettings,
  saveLocalVoiceSettings,
  VOICE_SPEED_OPTIONS,
  type VoiceUserSettings,
} from "@/lib/voice";
import { AppPagePanel } from "@/components/AppPagePanel";
import { Card, ErrorBanner, PrimaryButton, TextField } from "@/components/ui";

export default function InstellingenPage() {
  const { user, profile, updateProfileFields, refreshProfile } = useAuth();
  const { app, lang } = useLanguage();
  const copy = app.settings;

  const [name, setName] = useState("");
  const [formal, setFormal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestVoice, setGuestVoice] = useState<VoiceUserSettings | null>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setFormal(profile.address_form !== "informeel");
  }, [profile?.address_form, profile?.display_name, profile?.id]);

  useEffect(() => {
    if (user) return;
    setGuestVoice(loadLocalVoiceSettings() ?? defaultVoiceSettings());
  }, [user]);

  const voiceSettings = useMemo(() => {
    if (user && profile) return resolveVoiceSettings(profile);
    return guestVoice ?? defaultVoiceSettings();
  }, [guestVoice, profile, user]);

  const currentVoiceName = getVoiceIdentity(voiceSettings.identityId).displayName;
  const rateStepHighlight = nearestVoiceSpeedStep(voiceSettings.playbackRate);

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
    else setMessage(copy.profileSaved);
  };

  const onPickRate = async (rate: number) => {
    setBusy(true);
    setError(null);
    const next: VoiceUserSettings = {
      identityId: voiceSettings.identityId,
      playbackRate: rate,
    };

    if (user) {
      const res = await updateProfileFields({ tts_playback_rate: rate });
      setBusy(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      setMessage(copy.speedSaved);
    } else {
      saveLocalVoiceSettings(next);
      setGuestVoice(next);
      setBusy(false);
      setMessage(copy.speedSavedLocal);
    }

    previewHartMaatjeVoice(voiceSettings.identityId, rate);
  };

  return (
    <AppPagePanel title={copy.title} intro={copy.intro}>
      <Card>
        <h2 className="mb-3 text-xl font-semibold text-[#2c2416]">
          {copy.navHeading}
        </h2>
        <div className="space-y-2">
          <Link
            href="/"
            className="block rounded-2xl border-2 border-[#4a6741] bg-[#eef3ea] px-4 py-4 text-center text-xl font-bold text-[#2c4a22]"
          >
            {copy.navHome}
          </Link>
          <Link
            href="/app/geheugen"
            className="block rounded-2xl border-2 border-[#d8ccb8] bg-white px-4 py-3 text-center text-xl font-semibold text-[#2c2416]"
          >
            {copy.navMemory}
          </Link>
          <Link
            href="/app/privacy"
            className="block rounded-2xl border-2 border-[#d8ccb8] bg-white px-4 py-3 text-center text-xl font-semibold text-[#2c2416]"
          >
            {copy.navPrivacy}
          </Link>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-[#2c2416]">{copy.emailHeading}</h2>
        <p className="mb-4 text-xl text-[#5c4a32]">{user?.email ?? "—"}</p>

        <TextField label={copy.nameLabel} value={name} onChange={setName} />

        <p className="mb-2 mt-4 text-xl font-medium text-[#2c2416]">
          {copy.addressHeading}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFormal(true)}
            className={`flex-1 rounded-2xl border-2 px-4 py-3 text-xl ${
              formal
                ? "border-[#4a6741] bg-[#4a6741] font-semibold text-white"
                : "border-[#d8ccb8] bg-white text-[#2c2416]"
            }`}
          >
            {copy.formal}
          </button>
          <button
            type="button"
            onClick={() => setFormal(false)}
            className={`flex-1 rounded-2xl border-2 px-4 py-3 text-xl ${
              !formal
                ? "border-[#4a6741] bg-[#4a6741] font-semibold text-white"
                : "border-[#d8ccb8] bg-white text-[#2c2416]"
            }`}
          >
            {copy.informal}
          </button>
        </div>

        <div className="mt-4">
          <PrimaryButton
            label={busy ? copy.saving : copy.saveProfile}
            disabled={busy || !user}
            onClick={() => void onSaveProfile()}
          />
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-xl font-semibold text-[#2c2416]">
          {copy.safetyTest.cardHeading}
        </h2>
        <p className="mb-4 text-lg leading-relaxed text-[#5c4a32] sm:text-xl">
          {copy.safetyTest.cardIntro}
        </p>
        <Link
          href="/app/instellingen/veiligheidstest"
          className="block rounded-2xl border-2 border-[#4a6741] bg-[#eef3ea] px-4 py-4 text-center text-xl font-bold text-[#2c4a22]"
        >
          {copy.safetyTest.openLink}
        </Link>
      </Card>

      <Card>
        <h2 className="mb-1 text-xl font-semibold text-[#2c2416]">
          {copy.speedHeading}
        </h2>
        <p className="mb-2 text-lg text-[#5c4a32] sm:text-xl">
          {copy.speedIntro(currentVoiceName)}
        </p>
        <p className="mb-3 text-lg text-[#5c4a32] sm:text-xl">{copy.speedHint}</p>
        <div className="flex flex-wrap gap-2">
          {VOICE_SPEED_OPTIONS.map((option) => {
            const selected = Math.abs(rateStepHighlight - option.rate) < 0.015;
            return (
              <button
                key={option.rate}
                type="button"
                onClick={() => void onPickRate(option.rate)}
                disabled={busy}
                className={`flex-1 rounded-2xl border-2 px-3 py-3.5 text-lg disabled:opacity-60 sm:text-xl ${
                  selected
                    ? "border-[#4a6741] bg-[#4a6741] font-semibold text-white"
                    : "border-[#d8ccb8] bg-white text-[#2c2416]"
                }`}
              >
                {getVoiceSpeedLabel(lang, option.rate)}
              </button>
            );
          })}
        </div>
      </Card>

      <ErrorBanner message={error} />
      {message ? (
        <p className="rounded-xl border-2 border-[#4a6741]/40 bg-[#eef3ea] px-4 py-3 text-xl text-[#3d5636]">
          {message}
        </p>
      ) : null}

      {user ? (
        <PrimaryButton
          label={copy.reloadFromServer}
          variant="outline"
          onClick={() => void refreshProfile()}
        />
      ) : null}
    </AppPagePanel>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { InnerPageBackground } from "@/components/InnerPageBackground";
import { AppPagePanel } from "@/components/AppPagePanel";
import { Card, ErrorBanner, PrimaryButton, TextField } from "@/components/ui";
import {
  voiceModelsApi,
  type VoiceModelStatus,
  type VoicePersonaId,
} from "@/lib/hartmaatje-api/client";

const PERSONAS: { id: VoicePersonaId; name: string }[] = [
  { id: "fenna", name: "Fenna" },
  { id: "maarten", name: "Maarten" },
  { id: "peter", name: "Peter" },
  { id: "colette", name: "Colette" },
];

const ADMIN_KEY_STORAGE = "hartmaatje_voice_admin_key";

function formatUploadedAt(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("nl-NL");
  } catch {
    return iso;
  }
}

function PersonaVoiceCard({
  personaId,
  personaName,
  status,
  adminKey,
  onChanged,
}: {
  personaId: VoicePersonaId;
  personaName: string;
  status: VoiceModelStatus | undefined;
  adminKey: string;
  onChanged: () => void;
}) {
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [indexFile, setIndexFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const indexInputRef = useRef<HTMLInputElement>(null);

  const hasModel = status?.has_model ?? false;

  const onUpload = async () => {
    setError(null);
    setNotice(null);
    if (!adminKey.trim()) {
      setError("Vul eerst de beheerderssleutel hierboven in.");
      return;
    }
    if (!modelFile) {
      setError("Kies een .pth modelbestand.");
      return;
    }
    setBusy(true);
    try {
      await voiceModelsApi.upload(personaId, adminKey.trim(), modelFile, indexFile);
      setNotice(`Stem voor ${personaName} geüpload.`);
      setModelFile(null);
      setIndexFile(null);
      if (modelInputRef.current) modelInputRef.current.value = "";
      if (indexInputRef.current) indexInputRef.current.value = "";
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uploaden is mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setError(null);
    setNotice(null);
    if (!adminKey.trim()) {
      setError("Vul eerst de beheerderssleutel hierboven in.");
      return;
    }
    if (!window.confirm(`Eigen stem voor ${personaName} verwijderen?`)) return;
    setBusy(true);
    try {
      await voiceModelsApi.remove(personaId, adminKey.trim());
      setNotice(`Eigen stem voor ${personaName} verwijderd.`);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verwijderen is mislukt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[#2c2416]">{personaName}</h2>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            hasModel
              ? "bg-[#eef3ea] text-[#2c4a22]"
              : "bg-[#f1ece2] text-[#5c4a32]"
          }`}
        >
          {hasModel ? "Eigen stem actief" : "Standaardstem"}
        </span>
      </div>

      {hasModel ? (
        <p className="mt-2 text-sm text-[#5c4a32]">
          {status?.original_filename ?? "model.pth"}
          {status?.has_index ? ` + ${status.index_filename ?? "index"}` : ""}
          {status?.uploaded_at ? ` — geüpload ${formatUploadedAt(status.uploaded_at)}` : ""}
        </p>
      ) : (
        <p className="mt-2 text-sm text-[#5c4a32]">
          Nog geen getrainde stem geüpload — {personaName} gebruikt de standaard Gemini-stem.
        </p>
      )}

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#2c2416]">
            Modelbestand (.pth)
          </span>
          <input
            ref={modelInputRef}
            type="file"
            accept=".pth"
            onChange={(e) => setModelFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-[#2c2416]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#2c2416]">
            Indexbestand (.index) — optioneel, verbetert kwaliteit
          </span>
          <input
            ref={indexInputRef}
            type="file"
            accept=".index"
            onChange={(e) => setIndexFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-[#2c2416]"
          />
        </label>
      </div>

      <ErrorBanner message={error} />
      {notice ? (
        <p className="mt-3 rounded-xl border-2 border-[#4a6741]/40 bg-[#eef3ea] px-4 py-2 text-sm text-[#3d5636]">
          {notice}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <PrimaryButton
          label={busy ? "Bezig…" : `Upload voor ${personaName}`}
          onClick={() => void onUpload()}
          disabled={busy || !modelFile}
          className="text-lg"
        />
        {hasModel ? (
          <PrimaryButton
            label="Verwijder eigen stem"
            variant="outline"
            onClick={() => void onDelete()}
            disabled={busy}
            className="text-lg"
          />
        ) : null}
      </div>
    </Card>
  );
}

function readStoredAdminKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_KEY_STORAGE) ?? "";
}

export default function VoiceChangerPage() {
  const [adminKey, setAdminKey] = useState(readStoredAdminKey);
  const [models, setModels] = useState<VoiceModelStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (adminKey) window.localStorage.setItem(ADMIN_KEY_STORAGE, adminKey);
  }, [adminKey]);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await voiceModelsApi.list();
      setModels(res.models);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Kon status niet laden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <>
      <InnerPageBackground />
      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <AppPagePanel
          title="Stem-wisselaar"
          intro="Upload hier een eigen getrainde stem (RVC .pth-bestand, bijvoorbeeld getraind met Applio) per personage. Zodra een stem is geüpload, gebruikt dat personage automatisch die stem in gesprekken — anders blijft de standaard Gemini-stem actief."
        >
          <Card>
            <TextField
              label="Beheerderssleutel (ADMIN_API_KEY op de server)"
              value={adminKey}
              onChange={setAdminKey}
              type="password"
              placeholder="••••••••"
              autoComplete="off"
            />
            <p className="mt-2 text-sm text-[#5c4a32]">
              Deze sleutel wordt alleen lokaal in deze browser onthouden en bij elke
              upload/verwijdering meegestuurd naar de server.
            </p>
          </Card>

          <ErrorBanner message={loadError} />

          {loading ? (
            <p className="text-lg text-[#5c4a32]">Bezig met laden…</p>
          ) : (
            <div className="space-y-4">
              {PERSONAS.map((persona) => (
                <PersonaVoiceCard
                  key={persona.id}
                  personaId={persona.id}
                  personaName={persona.name}
                  status={models.find((m) => m.persona_id === persona.id)}
                  adminKey={adminKey}
                  onChanged={() => void reload()}
                />
              ))}
            </div>
          )}
        </AppPagePanel>
      </div>
    </>
  );
}

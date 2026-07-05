"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  CONSENT_DOCUMENT_VERSION,
  MESSAGE_RETENTION_OPTIONS,
} from "@/lib/constants";
import { buildUserDataExport, downloadUserDataExport } from "@/lib/exportUserData";
import { requestAccountDeletion } from "@/lib/requestAccountDeletion";
import { getSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { AppPagePanel } from "@/components/AppPagePanel";
import { Card, ErrorBanner, PrimaryButton } from "@/components/ui";

export default function PrivacyPage() {
  const router = useRouter();
  const { user, profile, refreshProfile, updateProfileFields } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [previewLines, setPreviewLines] = useState<string[] | null>(null);

  const loadPreview = useCallback(async () => {
    setBusy("preview");
    setError(null);
    const { data, error: err } = await buildUserDataExport();
    setBusy(null);
    if (err) {
      setError(err);
      return;
    }
    setPreviewLines([
      `Profielregels: ${data.profile ? "1" : "0"}`,
      `Geheugenfeiten: ${data.memory_facts.length}`,
      `Gesprekken: ${data.conversations.length}`,
      `Berichten totaal: ${data.conversations.reduce(
        (n, x) => n + x.messages.length,
        0,
      )}`,
      `Toestemmingslog: ${data.consent_audit.length} regels`,
    ]);
  }, []);

  const onExport = async () => {
    setBusy("export");
    setError(null);
    const res = await downloadUserDataExport();
    setBusy(null);
    if (res.error) setError(res.error);
    else setInfo("Uw export is gedownload naar uw apparaat.");
  };

  const revoke = async (kind: "analytics" | "cloud_processing", column: string) => {
    const client = getSupabase();
    const uid = user?.id;
    if (!client || !uid) return;
    setBusy(kind);
    await client.from("profiles").update({ [column]: null }).eq("id", uid);
    await client.from("consent_audit").insert({
      user_id: uid,
      kind,
      granted: false,
      consent_version: CONSENT_DOCUMENT_VERSION,
    });
    await refreshProfile();
    setBusy(null);
    setInfo("Toestemming is bijgewerkt in uw profiel.");
  };

  const onDeleteAccount = async () => {
    if (
      !window.confirm(
        "Dit verwijdert uw account, profiel, gesprekken, geheugen en logboeken definitief. Doorgaan?",
      )
    )
      return;
    if (!window.confirm("Laatste bevestiging: weet u zeker dat alles weg moet?"))
      return;
    setBusy("delete");
    const res = await requestAccountDeletion();
    setBusy(null);
    if (res.error) setError(res.error);
    else router.replace("/");
  };

  return (
    <AppPagePanel
      title="Privacy-dashboard"
      intro="U heeft recht op inzage, correctie, export en verwijdering (AVG). Correcties doet u deels zelf via Instellingen (profiel) en Geheugen (feiten). Hieronder exporteert u alles of wist u het volledige account."
    >
      <Card>
        <h2 className="mb-2 text-xl font-semibold text-[#2c2416]">
          Wat we bijhouden (kort)
        </h2>
        <ul className="list-inside list-disc space-y-2 text-lg text-[#5c4a32]">
          <li>Profiel en voorkeuren (naam, aanspreekvorm, stem/tempo, bewaartermijn)</li>
          <li>Toestemmingen en wijzigingen daarvan</li>
          <li>Geheugenfeiten die u zelf opslaat</li>
          <li>Gesprekken en berichten met de AI</li>
          <li>Versie privacytekst: {CONSENT_DOCUMENT_VERSION}</li>
        </ul>
      </Card>

      <ErrorBanner message={error} />
      {info ? (
        <p className="rounded-xl border-2 border-[#4a6741]/40 bg-[#eef3ea] px-4 py-3 text-lg text-[#3d5636]">
          {info}
        </p>
      ) : null}

      <PrimaryButton
        label="Voorbeeld van omvang tonen"
        variant="outline"
        onClick={() => void loadPreview()}
        disabled={Boolean(busy)}
      />
      {previewLines ? (
        <div className="rounded-2xl border border-[#e8dfd0]/80 bg-white p-4">
          {previewLines.map((line) => (
            <p key={line} className="text-lg text-[#2c2416]">
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <PrimaryButton
        label={busy === "export" ? "Bezig…" : "Exporteer al mijn gegevens (JSON)"}
        disabled={Boolean(busy)}
        onClick={() => void onExport()}
      />

      <div>
        <h2 className="mb-2 mt-4 text-xl font-semibold text-[#2c2416]">
          Bewaartermijn chatberichten
        </h2>
        <p className="mb-3 text-base text-[#5c4a32]">
          Kiest u een termijn, dan worden berichten ouder dan die periode
          periodiek van de server verwijderd. Geheugenfeiten vallen hier niet
          onder.
        </p>
        <div className="space-y-2">
          {MESSAGE_RETENTION_OPTIONS.map((opt) => {
            const cur = profile?.message_retention_days ?? null;
            const sel =
              (opt.days == null && cur == null) ||
              (opt.days != null && cur != null && opt.days === cur);
            return (
              <button
                key={opt.label}
                type="button"
                disabled={Boolean(busy)}
                onClick={() => {
                  void (async () => {
                    setBusy("retention");
                    const res = await updateProfileFields({
                      message_retention_days: opt.days,
                    });
                    await refreshProfile();
                    setBusy(null);
                    if (res.error) setError(res.error);
                  })();
                }}
                className={`w-full rounded-2xl border-2 px-4 py-3 text-left text-lg ${
                  sel
                    ? "border-[#4a6741] bg-[#eef3ea] font-bold text-[#2c2416]"
                    : "border-[#d8ccb8] bg-white text-[#2c2416]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-2 mt-4 text-xl font-semibold text-[#2c2416]">
          Optionele toestemmingen intrekken
        </h2>
        <div className="space-y-2">
          <PrimaryButton
            label="Zet optionele analytiek uit"
            variant="outline"
            disabled={Boolean(busy) || !profile?.consent_analytics_at}
            onClick={() => void revoke("analytics", "consent_analytics_at")}
          />
          <PrimaryButton
            label="Trek optionele cloud-verwerking in"
            variant="outline"
            disabled={Boolean(busy) || !profile?.consent_cloud_at}
            onClick={() => void revoke("cloud_processing", "consent_cloud_at")}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border-2 border-red-300 bg-red-50/60 p-4">
        <h2 className="mb-2 text-xl font-semibold text-red-700">Gevaarzone</h2>
        <PrimaryButton
          label={busy === "delete" ? "Bezig…" : "Verwijder mijn volledige account"}
          disabled={Boolean(busy)}
          onClick={() => void onDeleteAccount()}
        />
      </div>
    </AppPagePanel>
  );
}

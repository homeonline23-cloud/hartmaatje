"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { CONSENT_DOCUMENT_VERSION } from "@/lib/constants";
import type { ConsentKind } from "@/lib/consent/consentKinds";
import { logConsentAudit } from "@/lib/consent/logConsentAudit";
import { translateApiError } from "@/lib/appLocale";
import { buildUserDataExport, downloadUserDataExport } from "@/lib/exportUserData";
import { requestAccountDeletion } from "@/lib/requestAccountDeletion";
import { getSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { AppPagePanel } from "@/components/AppPagePanel";
import { Card, ErrorBanner, PrimaryButton } from "@/components/ui";

export default function PrivacyPage() {
  const router = useRouter();
  const { user, profile, refreshProfile, updateProfileFields } = useAuth();
  const { app, lang } = useLanguage();
  const copy = app.privacy;
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
      setError(translateApiError(err, lang));
      return;
    }
    setPreviewLines([
      `${copy.previewProfileRows}: ${data.profile ? "1" : "0"}`,
      `${copy.previewMemoryFacts}: ${data.memory_facts.length}`,
      `${copy.previewConversations}: ${data.conversations.length}`,
      `${copy.previewMessagesTotal}: ${data.conversations.reduce(
        (n, x) => n + x.messages.length,
        0,
      )}`,
      `${copy.previewConsentLog}: ${data.consent_audit.length}`,
    ]);
  }, [copy, lang]);

  const onExport = async () => {
    setBusy("export");
    setError(null);
    const res = await downloadUserDataExport();
    setBusy(null);
    if (res.error) setError(translateApiError(res.error, lang));
    else setInfo(copy.exportDone);
  };

  const revoke = async (
    kind: Extract<ConsentKind, "analytics" | "cloud_processing">,
    column: string,
  ) => {
    const client = getSupabase();
    const uid = user?.id;
    if (!client || !uid) return;
    setBusy(kind);
    await client.from("profiles").update({ [column]: null }).eq("id", uid);
    const logged = await logConsentAudit(client, uid, [{ kind, granted: false }]);
    if (logged.error) {
      setBusy(null);
      setError(translateApiError(logged.error, lang));
      return;
    }
    await refreshProfile();
    setBusy(null);
    setInfo(copy.consentUpdated);
  };

  const onDeleteAccount = async () => {
    if (!window.confirm(copy.deleteConfirm1)) return;
    if (!window.confirm(copy.deleteConfirm2)) return;
    setBusy("delete");
    const res = await requestAccountDeletion();
    setBusy(null);
    if (res.error) setError(translateApiError(res.error, lang));
    else router.replace("/");
  };

  return (
    <AppPagePanel title={copy.title} intro={copy.intro}>
      <Card>
        <h2 className="mb-2 text-xl font-semibold text-[#2c2416]">
          {copy.whatWeKeepHeading}
        </h2>
        <ul className="list-inside list-disc space-y-2 text-lg text-[#5c4a32]">
          {copy.whatWeKeepItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>
            {copy.privacyVersionLabel}: {CONSENT_DOCUMENT_VERSION}
          </li>
        </ul>
      </Card>

      <Card>
        <h2 className="mb-2 text-xl font-semibold text-[#2c2416]">
          {copy.voicesHeading}
        </h2>
        <p className="text-lg leading-relaxed text-[#5c4a32]">{copy.voicesBody}</p>
      </Card>

      <ErrorBanner message={error} />
      {info ? (
        <p className="rounded-xl border-2 border-[#4a6741]/40 bg-[#eef3ea] px-4 py-3 text-lg text-[#3d5636]">
          {info}
        </p>
      ) : null}

      <PrimaryButton
        label={copy.previewButton}
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
        label={busy === "export" ? copy.busy : copy.exportButton}
        disabled={Boolean(busy)}
        onClick={() => void onExport()}
      />

      <div>
        <h2 className="mb-2 mt-4 text-xl font-semibold text-[#2c2416]">
          {copy.retentionHeading}
        </h2>
        <p className="mb-3 text-base text-[#5c4a32]">{copy.retentionIntro}</p>
        <div className="space-y-2">
          {app.retentionOptions.map((opt) => {
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
                    if (res.error) setError(translateApiError(res.error, lang));
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
          {copy.revokeHeading}
        </h2>
        <div className="space-y-2">
          <PrimaryButton
            label={copy.revokeAnalytics}
            variant="outline"
            disabled={Boolean(busy) || !profile?.consent_analytics_at}
            onClick={() => void revoke("analytics", "consent_analytics_at")}
          />
          <PrimaryButton
            label={copy.revokeCloud}
            variant="outline"
            disabled={Boolean(busy) || !profile?.consent_cloud_at}
            onClick={() => void revoke("cloud_processing", "consent_cloud_at")}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border-2 border-red-300 bg-red-50/60 p-4">
        <h2 className="mb-2 text-xl font-semibold text-red-700">
          {copy.dangerZoneHeading}
        </h2>
        <PrimaryButton
          label={busy === "delete" ? copy.busy : copy.deleteAccountButton}
          disabled={Boolean(busy)}
          onClick={() => void onDeleteAccount()}
        />
      </div>
    </AppPagePanel>
  );
}

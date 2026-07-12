import type { SupabaseClient } from "@supabase/supabase-js";

import { CONSENT_DOCUMENT_VERSION } from "@/lib/constants";

import type { ConsentLogRow } from "./consentKinds";

export async function logConsentAudit(
  client: SupabaseClient,
  userId: string,
  rows: ConsentLogRow[],
): Promise<{ error?: string }> {
  const payload = rows.map((row) => ({
    user_id: userId,
    kind: row.kind,
    granted: row.granted,
    consent_version: CONSENT_DOCUMENT_VERSION,
  }));

  const { error } = await client.from("consent_audit").insert(payload);
  return error ? { error: error.message } : {};
}

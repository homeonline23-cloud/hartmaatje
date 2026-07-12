import type { SupabaseClient } from "@supabase/supabase-js";

import { CONSENT_DOCUMENT_VERSION } from "@/lib/constants";

import type { Profile } from "@/lib/profile/types";

function isMissingProfileError(message: string, code?: string): boolean {
  if (code === "PGRST116") return true;
  const m = message.toLowerCase();
  return m.includes("0 rows") || m.includes("no rows");
}

function isDuplicateProfileError(message: string, code?: string): boolean {
  if (code === "23505") return true;
  const m = message.toLowerCase();
  return m.includes("duplicate") || m.includes("already exists");
}

export async function fetchUserProfile(
  client: SupabaseClient,
  userId: string,
): Promise<{ profile: Profile | null; error?: string; missing?: boolean }> {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    if (isMissingProfileError(error.message, error.code)) {
      return { profile: null, missing: true };
    }
    return { profile: null, error: error.message };
  }

  return { profile: data as Profile };
}

/** Maakt een standaard profiel aan als de signup-trigger niet liep. */
export async function ensureDefaultUserProfile(
  client: SupabaseClient,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await client.from("profiles").insert({
    id: userId,
    address_form: "formeel",
    consent_document_version: CONSENT_DOCUMENT_VERSION,
  });

  if (!error) return { ok: true };
  if (isDuplicateProfileError(error.message, error.code)) return { ok: true };
  return { ok: false, error: error.message };
}

export async function loadOrCreateUserProfile(
  client: SupabaseClient,
  userId: string,
): Promise<{ profile: Profile | null; error?: string }> {
  const first = await fetchUserProfile(client, userId);
  if (first.profile) return { profile: first.profile };
  if (first.error) return { profile: null, error: first.error };

  if (first.missing) {
    const ensured = await ensureDefaultUserProfile(client, userId);
    if (!ensured.ok) {
      return {
        profile: null,
        error: ensured.error ?? "Profiel kon niet worden aangemaakt.",
      };
    }

    const retry = await fetchUserProfile(client, userId);
    if (retry.profile) return { profile: retry.profile };
    return {
      profile: null,
      error: retry.error ?? "Profiel kon niet worden geladen.",
    };
  }

  return { profile: null, error: "Profiel kon niet worden geladen." };
}

export function readableProfileError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("jwt") || m.includes("session")) {
    return "Uw sessie is verlopen. Log opnieuw in.";
  }
  if (m.includes("permission") || m.includes("row-level security")) {
    return "Uw profiel kon niet worden geladen door een rechtenprobleem.";
  }
  return "Uw profiel kon niet worden geladen. Probeer het opnieuw.";
}

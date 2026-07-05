import { getSupabase } from "@/lib/supabase";

/** Verwijdert auth-gebruiker server-side; rijen vallen weg via ON DELETE CASCADE. */
export async function requestAccountDeletion(): Promise<{ error?: string }> {
  const client = getSupabase();
  if (!client) return { error: "Geen verbinding." };

  const { data, error } = await client.functions.invoke<{
    ok?: boolean;
    error?: string;
  }>("delete-account", { body: {} });

  if (error) {
    return { error: error.message ?? "Account kon niet worden verwijderd." };
  }
  if (data && typeof data.error === "string") {
    return { error: data.error };
  }

  await client.auth.signOut();
  return {};
}

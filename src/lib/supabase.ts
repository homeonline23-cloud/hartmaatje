import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(url && anonKey);

let browserClient: SupabaseClient | null = null;

/** Browser-singleton. Sessie wordt in localStorage bewaard. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (typeof window === "undefined") return null;
  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return browserClient;
}

/** Voorkomt oneindig wachten als Supabase offline of gepauzeerd is. */
export async function withSupabaseTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
): Promise<T | null> {
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } catch {
    return null;
  }
}

export async function getAuthSession(
  client: SupabaseClient,
  timeoutMs = 2500,
): Promise<Session | null> {
  const result = await withSupabaseTimeout(client.auth.getSession(), timeoutMs);
  return result?.data.session ?? null;
}

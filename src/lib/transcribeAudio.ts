import { getSupabase, getAuthSession } from "@/lib/supabase";

type Out = { text?: string; error?: string };

/** Alleen in het verborgen nood-paneel als spraak (nog) niet beschikbaar is. */
export const VOICE_TYPING_FALLBACK =
  "Praten komt straks volledig online. Schrijf kort wat u wilt delen.";

export function isVoiceTypingFallback(error: string): boolean {
  return error.trim() === VOICE_TYPING_FALLBACK;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Stuurt korte browser-opnames (webm/mp4) naar Whisper via de Edge Function. */
export async function transcribeAudioBlob(
  blob: Blob,
): Promise<{ text?: string; error?: string }> {
  const client = getSupabase();
  if (!client) return { error: "Geen verbinding ingesteld." };

  const session = await getAuthSession(client);
  if (!session?.access_token) {
    return { error: VOICE_TYPING_FALLBACK };
  }

  const b64 = await blobToBase64(blob).catch(() => "");
  if (!b64) return { error: "Kon uw opname niet lezen." };

  const mime = blob.type && blob.type.startsWith("audio")
    ? blob.type
    : blob.type || "audio/webm";

  const { data, error } = await client.functions.invoke<Out>("transcribe", {
    body: { audio_base64: b64, mime_type: mime },
  });

  if (error) return { error: error.message ?? "Spraakservice werkte niet." };
  if (typeof data?.error === "string" && data.error.trim())
    return { error: data.error.trim() };

  return { text: typeof data?.text === "string" ? data.text.trim() : "" };
}

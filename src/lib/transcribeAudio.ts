import { getSupabase, getAuthSession } from "@/lib/supabase";
import { getAppCopy, getVoiceTypingFallback, isVoiceTypingFallback } from "@/lib/appLocale";
import { DEFAULT_APP_LANG, type AppLang } from "@/lib/languages";

export { isVoiceTypingFallback, getVoiceTypingFallback };

type Out = { text?: string; error?: string };

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

async function transcribeViaGuestApi(
  blob: Blob,
  lang: AppLang,
): Promise<Out> {
  const errors = getAppCopy(lang).errors;
  const b64 = await blobToBase64(blob).catch(() => "");
  if (!b64) return { error: errors.couldNotReadRecording };

  const mime = blob.type?.startsWith("audio")
    ? blob.type
    : blob.type || "audio/webm";

  try {
    const res = await fetch("/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_base64: b64,
        mime_type: mime,
        lang,
      }),
    });
    const data = (await res.json()) as Out;
    if (!res.ok) {
      return { error: data.error ?? errors.speechServiceFailed };
    }
    return { text: data.text?.trim() ?? "" };
  } catch {
    return { error: errors.speechServiceFailed };
  }
}

/** Stuurt browser-opnames naar de server (ingelogd) of guest API. */
export async function transcribeAudioBlob(
  blob: Blob,
  lang: AppLang = DEFAULT_APP_LANG,
): Promise<{ text?: string; error?: string }> {
  const errors = getAppCopy(lang).errors;
  const client = getSupabase();

  if (!client) {
    return transcribeViaGuestApi(blob, lang);
  }

  const session = await getAuthSession(client);
  if (!session?.access_token) {
    return transcribeViaGuestApi(blob, lang);
  }

  const b64 = await blobToBase64(blob).catch(() => "");
  if (!b64) return { error: errors.couldNotReadRecording };

  const mime = blob.type && blob.type.startsWith("audio")
    ? blob.type
    : blob.type || "audio/webm";

  const { data, error } = await client.functions.invoke<Out>("transcribe", {
    body: { audio_base64: b64, mime_type: mime },
  });

  if (error) return { error: error.message ?? errors.speechServiceFailed };
  if (typeof data?.error === "string" && data.error.trim()) {
    return { error: data.error.trim() };
  }

  return { text: typeof data?.text === "string" ? data.text.trim() : "" };
}

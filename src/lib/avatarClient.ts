/**
 * Browser helper — call Next proxy (never hit Hetzner :8091 from the browser).
 */

export type AvatarLipsyncResponse = {
  ok: boolean;
  job_id?: string;
  companion_id?: string | null;
  video_url?: string;
  play_url?: string;
  error?: string;
};

export async function requestLipsync(
  audio: Blob,
  companionId?: string,
  filename = "speech.wav"
): Promise<AvatarLipsyncResponse> {
  const form = new FormData();
  form.append("audio", audio, filename);
  if (companionId) form.append("companion_id", companionId);

  const res = await fetch("/api/avatar/lipsync", {
    method: "POST",
    body: form,
  });

  const data = (await res.json().catch(() => ({}))) as AvatarLipsyncResponse;
  if (!res.ok && !data.error) {
    return { ok: false, error: `http_${res.status}` };
  }
  return data;
}

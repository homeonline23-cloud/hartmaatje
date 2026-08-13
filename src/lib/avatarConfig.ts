/**
 * HartMaatje lip-sync avatar API (Wav2Lip on Hetzner).
 *
 * Env:
 *   AVATAR_API_URL=http://YOUR_HETZNER_IP:8091
 */

function stripSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/** Base URL of the avatar FastAPI service (no trailing slash). */
export function getAvatarApiUrl(): string {
  const raw =
    process.env.AVATAR_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_AVATAR_API_URL?.trim() ||
    "http://127.0.0.1:8091";
  return stripSlash(raw);
}

export function isRemoteAvatarHost(host = getAvatarApiUrl()): boolean {
  try {
    const u = new URL(host);
    const h = u.hostname.toLowerCase();
    return !(h === "127.0.0.1" || h === "localhost" || h === "::1");
  } catch {
    return false;
  }
}

export type AvatarHealth = {
  ok: boolean;
  checkpoint?: boolean;
  wav2lip_repo?: boolean;
  device?: string;
  error?: string;
  host: string;
  remote: boolean;
};

export type LipsyncResult = {
  ok: boolean;
  job_id?: string;
  companion_id?: string | null;
  /** Path on avatar server, e.g. /output/abc.mp4 */
  video_url?: string;
  /** Safe browser URL via Next proxy */
  play_url?: string;
  error?: string;
};

/** Quick reachability check — used by /api/avatar/health */
export async function pingAvatar(
  host = getAvatarApiUrl(),
  timeoutMs = 5000
): Promise<AvatarHealth> {
  const base = stripSlash(host);
  const remote = isRemoteAvatarHost(base);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/health`, {
      method: "GET",
      signal: ctrl.signal,
    });
    if (!res.ok) {
      return {
        ok: false,
        host: base,
        remote,
        error: `http_${res.status}`,
      };
    }
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      checkpoint?: boolean;
      wav2lip_repo?: boolean;
      device?: string;
    };
    return {
      ok: Boolean(data.ok),
      checkpoint: data.checkpoint,
      wav2lip_repo: data.wav2lip_repo,
      device: data.device,
      host: base,
      remote,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unreachable";
    return { ok: false, host: base, remote, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Server-side: send audio bytes to Hetzner Wav2Lip.
 * CPU render can take a while — default timeout 10 minutes.
 */
export async function requestRemoteLipsync(opts: {
  audio: Blob | ArrayBuffer | Buffer;
  filename?: string;
  companionId?: string | null;
  timeoutMs?: number;
}): Promise<LipsyncResult> {
  const host = getAvatarApiUrl();
  const timeoutMs = opts.timeoutMs ?? 600_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const form = new FormData();
    const blob =
      opts.audio instanceof Blob
        ? opts.audio
        : new Blob([opts.audio as BlobPart], { type: "audio/wav" });
    form.append("audio", blob, opts.filename || "speech.wav");
    if (opts.companionId) {
      form.append("companion_id", opts.companionId);
    }

    const res = await fetch(`${host}/lipsync`, {
      method: "POST",
      body: form,
      signal: ctrl.signal,
    });

    const text = await res.text();
    let data: {
      job_id?: string;
      companion_id?: string | null;
      video_url?: string;
      detail?: string;
    } = {};
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      /* non-json */
    }

    if (!res.ok) {
      return {
        ok: false,
        error: data.detail || text.slice(0, 400) || `http_${res.status}`,
      };
    }

    const videoUrl = data.video_url || "";
    const name = videoUrl.split("/").pop() || "";
    return {
      ok: true,
      job_id: data.job_id,
      companion_id: data.companion_id ?? opts.companionId ?? null,
      video_url: videoUrl,
      play_url: name
        ? `/api/avatar/video/${encodeURIComponent(name)}`
        : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "lipsync_failed";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

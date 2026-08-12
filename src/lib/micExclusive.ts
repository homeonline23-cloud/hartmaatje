/**
 * Global exclusive microphone lock.
 * Only one owner (voice session vs mic-test) may hold live MediaStream tracks.
 */

export type MicOwner = "voice" | "mic-test" | "other";

/** Phone/tablet — prefer simple getUserMedia; skip Windows-only reopen delay. */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  // iPadOS desktop UA
  if (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1) {
    return true;
  }
  return false;
}

/** Safari / iOS (and all phones) drop user-activation after await setTimeout. */
export function needsImmediateMicGesture(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isMobileDevice()) return true;
  const ua = navigator.userAgent || "";
  // Desktop Safari (not Chrome/Chromium)
  return /Safari/i.test(ua) && !/Chrome|Chromium|Android/i.test(ua);
}

type Holder = {
  owner: MicOwner;
  stream: MediaStream;
  onRevoke?: () => void;
};

type MicLockEvent = {
  reason: "voice_claim" | "mic_test_claim" | "release" | "force_stop";
  owner: MicOwner;
};

const holders = new Set<Holder>();
const listeners = new Set<(ev: MicLockEvent) => void>();

let voiceSessionActive = false;

function emit(ev: MicLockEvent) {
  for (const cb of Array.from(listeners)) {
    try {
      cb(ev);
    } catch {
      /* ignore */
    }
  }
}

function stopStreamTracks(stream: MediaStream) {
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      /* ignore */
    }
  }
}

/** Subscribe to lock changes (mic-test UI stops when voice claims the mic). */
export function subscribeMicLock(cb: (ev: MicLockEvent) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isVoiceSessionMicActive(): boolean {
  return voiceSessionActive;
}

/** Force-stop every registered mic stream (optionally keep one owner). */
export function releaseAllMicrophones(exceptOwner?: MicOwner): void {
  for (const holder of Array.from(holders)) {
    if (exceptOwner && holder.owner === exceptOwner) continue;
    holders.delete(holder);
    try {
      holder.onRevoke?.();
    } catch {
      /* ignore */
    }
    stopStreamTracks(holder.stream);
  }
  if (!exceptOwner || exceptOwner !== "voice") {
    voiceSessionActive = false;
  }
  emit({ reason: "force_stop", owner: exceptOwner || "other" });
  console.log("[hm-mic-lock] released all", { exceptOwner });
}

export function releaseMicrophoneOwner(owner: MicOwner): void {
  for (const holder of Array.from(holders)) {
    if (holder.owner !== owner) continue;
    holders.delete(holder);
    stopStreamTracks(holder.stream);
  }
  if (owner === "voice") voiceSessionActive = false;
  emit({ reason: "release", owner });
  console.log("[hm-mic-lock] released owner", owner);
}

/**
 * Register a live stream under an owner. Tracks are stopped on revoke/release.
 */
export function registerMicrophoneStream(
  stream: MediaStream,
  owner: MicOwner,
  onRevoke?: () => void
): () => void {
  const holder: Holder = { owner, stream, onRevoke };
  holders.add(holder);
  if (owner === "voice") voiceSessionActive = true;

  const trackEnded = () => {
    if (!holders.has(holder)) return;
    const live = stream.getTracks().some((t) => t.readyState === "live");
    if (!live) {
      holders.delete(holder);
      if (owner === "voice") voiceSessionActive = false;
    }
  };
  for (const t of stream.getTracks()) {
    t.addEventListener("ended", trackEnded);
  }

  return () => {
    holders.delete(holder);
    if (owner === "voice" && ![...holders].some((h) => h.owner === "voice")) {
      voiceSessionActive = false;
    }
    for (const t of stream.getTracks()) {
      t.removeEventListener("ended", trackEnded);
    }
  };
}

/**
 * Stop every other listener, then open a fresh exclusive getUserMedia.
 * Windows may need a short gap after track.stop(); Safari/iOS must NOT await
 * a timer first or the tap-gesture is lost and the mic never opens.
 */
export async function claimExclusiveMicrophone(
  owner: MicOwner,
  openHardware: () => Promise<MediaStream>
): Promise<MediaStream> {
  if (owner !== "voice" && voiceSessionActive) {
    throw new Error(
      "Gesprek is actief. Klik eerst «Uit» bij Fenna, daarna pas de microfoon-test."
    );
  }

  const hadLiveHolders = holders.size > 0;

  // Kill every other listener (mic-test analyzers, stale tracks) before reopen
  releaseAllMicrophones();
  if (owner === "voice") {
    voiceSessionActive = true;
    emit({ reason: "voice_claim", owner });
  } else {
    emit({ reason: "mic_test_claim", owner });
  }

  // Only delay when we actually freed another mic — never on Safari/iOS.
  if (hadLiveHolders && !needsImmediateMicGesture()) {
    await new Promise((r) => setTimeout(r, 120));
  }

  const stream = await openHardware();
  registerMicrophoneStream(stream, owner);
  console.log("[hm-mic-lock] claimed", owner, {
    tracks: stream.getTracks().map((t) => t.label),
    hadLiveHolders,
  });
  return stream;
}

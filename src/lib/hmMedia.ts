/**
 * Track Audio() players that are NOT in the DOM.
 * querySelectorAll("audio") misses them, so they keep speaking after navigate/refresh.
 */

type HmMediaKind = "story" | "voice" | "other";

type Entry = {
  el: HTMLMediaElement;
  kind: HmMediaKind;
};

const registry = new Set<Entry>();

function forget(entry: Entry) {
  registry.delete(entry);
}

export function trackHmMedia(
  el: HTMLMediaElement,
  kind: HmMediaKind = "other"
): () => void {
  const entry: Entry = { el, kind };
  registry.add(entry);
  const cleanup = () => forget(entry);
  el.addEventListener("ended", cleanup);
  el.addEventListener("error", cleanup);
  return () => {
    el.removeEventListener("ended", cleanup);
    el.removeEventListener("error", cleanup);
    forget(entry);
  };
}

export function silenceHmMedia(kinds?: HmMediaKind | HmMediaKind[]) {
  const allow =
    kinds == null
      ? null
      : new Set(Array.isArray(kinds) ? kinds : [kinds]);

  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }

  for (const entry of Array.from(registry)) {
    if (allow && !allow.has(entry.kind)) continue;
    const media = entry.el;
    try {
      media.pause();
      media.removeAttribute("src");
      media.load();
    } catch {
      /* ignore */
    }
    registry.delete(entry);
  }

  // Also stop any in-DOM media (welcome videos, etc.)
  if (typeof document !== "undefined") {
    for (const el of Array.from(document.querySelectorAll("audio,video"))) {
      const media = el as HTMLMediaElement;
      try {
        media.pause();
        if (media.tagName === "AUDIO") {
          media.removeAttribute("src");
          media.load();
        }
      } catch {
        /* ignore */
      }
    }
  }
}

export function createTrackedAudio(kind: HmMediaKind = "other"): HTMLAudioElement {
  const audio = new Audio();
  trackHmMedia(audio, kind);
  return audio;
}

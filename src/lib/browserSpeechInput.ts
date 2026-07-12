import type { AppLang } from "@/lib/languages";
import { getVoiceLocaleForLang } from "@/lib/languages";

type SpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: { transcript?: string };
};

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
};

type SpeechRecognitionErrorEvent = Event & {
  error?: string;
};

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
};

export type BrowserSpeechSession = {
  stop: () => void;
};

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionInstance)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isBrowserSpeechInputSupported(): boolean {
  return Boolean(getSpeechRecognitionCtor());
}

/**
 * Push-to-talk: mic stays open until `stop()` — Chrome's one-shot mode
 * closes after ~1s of silence, which feels like the mic "won't stay open".
 */
export function listenWithBrowserSpeechUntilStop(
  lang: AppLang,
  handlers: {
    onText: (text: string) => void;
    onInterim?: (text: string) => void;
    onEnded?: () => void;
    onError?: (code: string) => void;
  },
): BrowserSpeechSession | null {
  const SR = getSpeechRecognitionCtor();
  if (!SR) return null;

  let active = true;
  let manualStop = false;
  const finals: string[] = [];
  let restartTimer: ReturnType<typeof setTimeout> | null = null;

  const rec = new SR();
  rec.lang = getVoiceLocaleForLang(lang);
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;

  const clearRestartTimer = () => {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  };

  const startListening = () => {
    if (!active) return;
    try {
      rec.start();
    } catch {
      /* already started */
    }
  };

  const finish = (sendText: boolean) => {
    if (!active) return;
    active = false;
    clearRestartTimer();
    if (sendText) {
      handlers.onText(finals.join(" ").trim());
    }
    handlers.onEnded?.();
  };

  rec.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript?.trim() ?? "";
      if (!text) continue;
      if (result.isFinal) {
        finals.push(text);
      } else {
        interim = text;
      }
    }
    if (interim) handlers.onInterim?.(interim);
  };

  rec.onerror = (event) => {
    const code = (event as SpeechRecognitionErrorEvent).error ?? "";
    if (code === "no-speech" || code === "aborted") return;
    if (code === "not-allowed" || code === "service-not-allowed") {
      handlers.onError?.(code);
      finish(false);
      return;
    }
  };

  rec.onend = () => {
    if (manualStop) {
      finish(true);
      return;
    }
    if (active) {
      clearRestartTimer();
      restartTimer = setTimeout(startListening, 150);
    }
  };

  try {
    startListening();
  } catch {
    handlers.onEnded?.();
    return null;
  }

  return {
    stop: () => {
      if (!active) return;
      manualStop = true;
      clearRestartTimer();
      try {
        rec.stop();
      } catch {
        try {
          rec.abort();
        } catch {
          finish(true);
        }
      }
    },
  };
}

/** One-shot: stops after the first phrase (legacy HartMaatje flow). */
export function listenWithBrowserSpeech(
  lang: AppLang,
  onText: (text: string) => void,
  onEnd?: () => void,
): BrowserSpeechSession | null {
  const SR = getSpeechRecognitionCtor();
  if (!SR) return null;

  const rec = new SR();
  rec.lang = getVoiceLocaleForLang(lang);
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    onEnd?.();
  };

  rec.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim();
    if (transcript) onText(transcript);
  };
  rec.onerror = () => {
    finish();
  };
  rec.onend = () => {
    finish();
  };

  try {
    rec.start();
  } catch {
    finish();
    return null;
  }

  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        try {
          rec.abort();
        } catch {
          finish();
        }
      }
    },
  };
}

export function stopBrowserSpeechInput(
  rec: BrowserSpeechSession | null,
): void {
  rec?.stop();
}

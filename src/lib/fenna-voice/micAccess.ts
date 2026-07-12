import type { AppLang } from "@/lib/languages";
import { voiceLog } from "@/lib/fenna-voice/voiceLogger";

export type MicAccessErrorCode =
  | "unsupported"
  | "denied"
  | "not_found"
  | "busy"
  | "unknown";

export class MicAccessError extends Error {
  readonly code: MicAccessErrorCode;

  constructor(code: MicAccessErrorCode, message: string) {
    super(message);
    this.name = "MicAccessError";
    this.code = code;
  }
}

const MESSAGES: Record<AppLang, Record<MicAccessErrorCode, string>> = {
  nl: {
    unsupported:
      "Uw browser ondersteunt geen microfoon. Open HartMaatje in Chrome of Edge.",
    denied:
      "Geef toestemming voor de microfoon: klik op het slotje naast het webadres en kies Toestaan.",
    not_found:
      "Geen microfoon gevonden. Sluit een microfoon aan of kies in Windows → Geluid → Ingang het juiste apparaat.",
    busy:
      "De microfoon is bezet of werkt niet. Sluit andere programma's die de microfoon gebruiken en test in Windows → Geluid → Ingang.",
    unknown:
      "De microfoon kon niet worden gestart. Test uw microfoon in Windows Instellingen → Geluid.",
  },
  en: {
    unsupported:
      "Your browser does not support the microphone. Open HartMaatje in Chrome or Edge.",
    denied:
      "Please allow microphone access: click the lock icon next to the address bar and choose Allow.",
    not_found:
      "No microphone found. Plug one in or choose the correct device in Windows → Sound → Input.",
    busy:
      "The microphone is busy or not working. Close other apps using the mic and test in Windows → Sound → Input.",
    unknown:
      "Could not start the microphone. Test it in Windows Settings → Sound.",
  },
};

export function micErrorMessage(code: MicAccessErrorCode, lang: AppLang): string {
  return MESSAGES[lang][code];
}

function mapDomException(err: unknown, lang: AppLang): MicAccessError {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      return new MicAccessError("denied", micErrorMessage("denied", lang));
    }
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      return new MicAccessError("not_found", micErrorMessage("not_found", lang));
    }
    if (err.name === "NotReadableError" || err.name === "TrackStartError") {
      return new MicAccessError("busy", micErrorMessage("busy", lang));
    }
  }
  return new MicAccessError(
    "unknown",
    err instanceof Error ? err.message : micErrorMessage("unknown", lang),
  );
}

/** Ask the browser for microphone access — clear errors for older users. */
export async function requestMicrophoneStream(lang: AppLang): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new MicAccessError("unsupported", micErrorMessage("unsupported", lang));
  }

  voiceLog("requesting microphone permission");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const track = stream.getAudioTracks()[0];
    voiceLog("microphone granted", {
      label: track?.label ?? "unknown",
      muted: track?.muted ?? false,
      enabled: track?.enabled ?? false,
      readyState: track?.readyState ?? "unknown",
    });

    if (track?.muted) {
      voiceLog("warning: microphone track is muted at system level");
    }

    return stream;
  } catch (err) {
    voiceLog("microphone access failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw mapDomException(err, lang);
  }
}

/** RMS volume 0–100 from an AnalyserNode. */
export function readAnalyserVolume(analyser: AnalyserNode): number {
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i]! - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length) * 100;
}

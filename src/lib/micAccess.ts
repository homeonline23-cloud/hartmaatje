"use client";

import {
  claimExclusiveMicrophone,
  isMobileDevice,
  releaseMicrophoneOwner,
  type MicOwner,
} from "@/lib/micExclusive";

export type MicAccessErrorCode =
  | "unsupported"
  | "insecure"
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

const SITE = "https://hartmaatje.app";

function isApplePhoneOrPad(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return (
    navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1
  );
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

function nlMessages(): Record<MicAccessErrorCode, string> {
  if (isApplePhoneOrPad()) {
    return {
      unsupported: `Stemgesprek werkt hier niet. Open ${SITE} in Safari (niet in Instagram/Facebook).`,
      insecure: `Voor de microfoon moet u ${SITE} openen in Safari.`,
      denied:
        "Microfoon geweigerd. Op iPhone: Instellingen → Safari → Microfoon → Toestaan. Of bij Home-scherm-app: Instellingen → HartMaatje → Microfoon Aan. Herlaad daarna de pagina.",
      not_found:
        "Geen microfoon gevonden. Controleer Instellingen → Privacy & Beveiliging → Microfoon → Safari (of HartMaatje) Aan.",
      busy:
        "Microfoon is bezet. Sluit FaceTime, WhatsApp-gesprek of Spraakmemo’s, en probeer opnieuw.",
      unknown: `Microfoon start niet. Open ${SITE} in Safari, sta de microfoon toe, en herlaad.`,
    };
  }
  if (isAndroid()) {
    return {
      unsupported: `Stemgesprek werkt hier niet. Open ${SITE} in Chrome of Samsung Internet (niet in WhatsApp/Facebook).`,
      insecure: `Voor de microfoon moet u ${SITE} openen in Chrome of Samsung Internet.`,
      denied:
        "Microfoon geweigerd. Op Android: Instellingen → Apps → Chrome (of Samsung Internet) → Machtigingen → Microfoon → Toestaan. Daarna in de browser: slotje naast de adresbalk → Microfoon Toestaan → herlaad.",
      not_found:
        "Geen microfoon gevonden. Controleer Instellingen → Apps → Chrome → Machtigingen → Microfoon.",
      busy:
        "Microfoon is bezet. Sluit telefoongesprek, WhatsApp-gesprek of Spraakrecorder, en probeer opnieuw.",
      unknown: `Microfoon start niet. Open ${SITE} in Chrome, sta de microfoon toe, en herlaad.`,
    };
  }
  return {
    unsupported: `Stemgesprek werkt niet in dit venster. Open ${SITE} in Chrome, Edge of Safari (niet in een preview-venster).`,
    insecure: `Voor de microfoon is een beveiligde pagina nodig. Open ${SITE} in uw browser.`,
    denied:
      "Microfoon geweigerd. Klik op het slotje links in de adresbalk → Microfoon → Toestaan → herlaad de pagina.",
    not_found:
      "Geen microfoon gevonden. Controleer de microfoon van dit apparaat in de systeeminstellingen.",
    busy:
      "Microfoon is bezet. Sluit Zoom/Teams/Skype en de microfoon-test, klik «Uit» in het gesprek, en probeer opnieuw.",
    unknown: `Microfoon start niet. Open ${SITE}, sta de microfoon toe, en herlaad de pagina.`,
  };
}

export function micBlockMessage(code: MicAccessErrorCode): string {
  return nlMessages()[code];
}

/** Why mic cannot work right now, or null if OK to request. */
export function getMicrophoneBlockReason(): MicAccessErrorCode | null {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "unsupported";
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "insecure";
  }
  return null;
}

function mapDomException(err: unknown): MicAccessError {
  const NL = nlMessages();
  if (err instanceof MicAccessError) return err;
  if (err instanceof Error && /Gesprek is actief/i.test(err.message)) {
    return new MicAccessError("busy", err.message);
  }
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      return new MicAccessError("denied", NL.denied);
    }
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      return new MicAccessError("not_found", NL.not_found);
    }
    if (err.name === "NotReadableError" || err.name === "TrackStartError") {
      return new MicAccessError("busy", NL.busy);
    }
    if (err.name === "SecurityError") {
      return new MicAccessError("insecure", NL.insecure);
    }
  }
  return new MicAccessError(
    "unknown",
    err instanceof Error && err.message ? `${NL.unknown} (${err.message})` : NL.unknown
  );
}

/** Raw hardware open — prefer requestMicrophoneStream (exclusive lock). */
export async function openMicrophoneHardware(): Promise<MediaStream> {
  const NL = nlMessages();
  const blocked = getMicrophoneBlockReason();
  if (blocked) {
    throw new MicAccessError(blocked, NL[blocked]);
  }

  const finish = (stream: MediaStream): MediaStream => {
    const track = stream.getAudioTracks()[0];
    if (!track) {
      stream.getTracks().forEach((t) => t.stop());
      throw new MicAccessError("not_found", NL.not_found);
    }
    track.enabled = true;
    try {
      // Nudge Android/Samsung to actually start the capture pipeline
      void track.applyConstraints?.({}).catch?.(() => undefined);
    } catch {
      /* ignore */
    }
    return stream;
  };

  // Phones first: bare { audio: true }. Desktop: soft ideals, then fall back.
  const attempts: MediaStreamConstraints[] = isMobileDevice()
    ? [{ audio: true, video: false }]
    : [
        {
          audio: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: true,
            channelCount: { ideal: 1 },
            sampleRate: { ideal: 48000 },
          },
          video: false,
        },
        { audio: true, video: false },
      ];

  let lastErr: unknown;
  for (const constraints of attempts) {
    try {
      return finish(await navigator.mediaDevices.getUserMedia(constraints));
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr instanceof MicAccessError) throw lastErr;
  throw mapDomException(lastErr);
}

/**
 * Ask for microphone on a user click — exclusive lock.
 * Voice session uses owner "voice" and forcibly stops Instellingen mic-test first.
 */
export async function requestMicrophoneStream(opts?: {
  owner?: MicOwner;
}): Promise<MediaStream> {
  const owner = opts?.owner ?? "other";
  try {
    return await claimExclusiveMicrophone(owner, openMicrophoneHardware);
  } catch (err) {
    throw mapDomException(err);
  }
}

export function releaseMicrophone(owner: MicOwner = "other"): void {
  releaseMicrophoneOwner(owner);
}

export function isMicPermissionError(err: unknown): boolean {
  if (err instanceof MicAccessError) {
    return (
      err.code === "denied" ||
      err.code === "insecure" ||
      err.code === "unsupported" ||
      err.code === "not_found" ||
      err.code === "busy"
    );
  }
  if (!(err instanceof DOMException) && !(err instanceof Error)) return false;
  const name = err.name;
  return (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    name === "SecurityError" ||
    name === "NotFoundError" ||
    name === "NotReadableError"
  );
}

export function micErrorText(err: unknown): string {
  if (err instanceof MicAccessError) return err.message;
  return mapDomException(err).message;
}

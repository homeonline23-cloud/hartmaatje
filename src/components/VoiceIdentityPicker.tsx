"use client";

import type { ReactNode } from "react";

type VoiceIdentityPickerProps = {
  mic: ReactNode;
  className?: string;
  welcomeBelowMic?: ReactNode;
};

/** Onderaan: microfoon + welkomsttekst — geen dubbele namen. */
export function VoiceIdentityPicker({
  mic,
  className = "",
  welcomeBelowMic,
}: VoiceIdentityPickerProps) {
  return (
    <div className={`flex flex-col items-center gap-2 text-center ${className}`}>
      {mic}
      {welcomeBelowMic ? (
        <div className="w-full space-y-2 px-2">{welcomeBelowMic}</div>
      ) : null}
    </div>
  );
}

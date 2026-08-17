"use client";

import { useEffect, useSyncExternalStore, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/i18n/LanguageProvider";
import {
  getFrontDeskNumber,
  getFrontDeskRoom,
  setFrontDeskNumber,
  setFrontDeskRoom,
} from "@/lib/frontDeskNumber";

const ROOM_MAX_LEN = 8;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSaveNumber?: (number: string) => void;
};

/** Staff-only config: sets the real phone number the red Bel Balie button dials,
 * plus an optional per-device room label (e.g. "204") shown on the calling popup. */
export function FrontDeskSettingsModal({
  isOpen,
  onClose,
  onSaveNumber,
}: Props) {
  const { t } = useI18n();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // Load the stored number/room once we're open on the client (avoids SSR mismatch).
  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhoneNumber(getFrontDeskNumber() ?? "");
    setRoomNumber(getFrontDeskRoom() ?? "");
  }, [isOpen]);

  const handleRoomChange = (raw: string) => {
    const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, ROOM_MAX_LEN).toUpperCase();
    setRoomNumber(cleaned);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleSave = () => {
    const trimmed = phoneNumber.trim();
    if (!trimmed) return;

    setFrontDeskNumber(trimmed);
    setFrontDeskRoom(roomNumber.trim());
    onSaveNumber?.(trimmed);

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSave();
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.frontDesk.settingsTitle}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label={t.frontDesk.settingsTitle}
        onClick={onClose}
      />

      <section
        className="hm-card relative z-10 flex w-full max-w-sm flex-col gap-3 px-5 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-snug text-[#3f6339]">
            {t.frontDesk.settingsTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-[#3f6339]/60 transition hover:bg-[#3f6339]/10 hover:text-[#3f6339]"
            aria-label={t.frontDesk.settingsTitle}
          >
            ✕
          </button>
        </div>

        <div>
          <label
            htmlFor="frontdesk-number"
            className="mb-1 block text-sm font-semibold text-[#3f6339]"
          >
            {t.frontDesk.settingsLabel}
          </label>
          <p className="text-xs leading-relaxed text-[#3f6339]/75">
            {t.frontDesk.settingsDescription}
          </p>
        </div>

        <div className="flex gap-2">
          <input
            id="frontdesk-number"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.frontDesk.settingsPlaceholder}
            autoFocus
            className="flex-1 rounded-xl border border-[#e8dfd0] bg-white/80 px-3 py-2 font-mono text-sm text-[#3f6339] focus:outline-none focus:ring-2 focus:ring-[#3f6339]/40"
          />
          <button
            type="button"
            onClick={handleSave}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] ${
              isSaved
                ? "bg-[#3f6339]"
                : "bg-[#c62828] hover:brightness-110"
            }`}
          >
            {isSaved ? t.frontDesk.settingsSaved : t.frontDesk.settingsSave}
          </button>
        </div>

        <div>
          <label
            htmlFor="frontdesk-room"
            className="mb-1 block text-sm font-semibold text-[#3f6339]"
          >
            {t.frontDesk.settingsRoomLabel}
          </label>
          <input
            id="frontdesk-room"
            type="text"
            inputMode="text"
            value={roomNumber}
            onChange={(e) => handleRoomChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="204"
            className="w-full rounded-xl border border-[#e8dfd0] bg-white/80 px-3 py-2 font-mono text-sm font-bold uppercase text-[#3f6339] focus:outline-none focus:ring-2 focus:ring-[#3f6339]/40"
          />
        </div>

        <p className="text-right text-[10px] text-[#3f6339]/60">
          {t.frontDesk.settingsEnterHint}
        </p>
      </section>
    </div>,
    document.body
  );
}

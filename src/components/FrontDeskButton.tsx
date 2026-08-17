"use client";

import { useEffect, useSyncExternalStore, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/i18n/LanguageProvider";
import { getFrontDeskNumber, getFrontDeskRoom } from "@/lib/frontDeskNumber";

/**
 * Front Desk / internal assistant dial — bottom-right corner only.
 * Replaces the previous real 112 emergency dialer (removed by explicit
 * product decision; there is intentionally no in-app emergency-dial
 * affordance anymore).
 *
 * The actual number is configured per-deployment via FrontDeskSettingsModal
 * (Instellingen → Bel Balie) and stored in localStorage — not hardcoded,
 * since every building/location has its own front desk line.
 */
export function FrontDeskButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [room, setRoom] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handlePress = () => {
    setOpen(true);
    setRoom(getFrontDeskRoom());
    const number = getFrontDeskNumber();
    if (number) {
      // Real call — the comforting modal stays on top while the dialer opens.
      window.location.href = `tel:${number}`;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePress}
        className="pointer-events-auto fixed bottom-3 right-3 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#c62828] text-white shadow-md ring-2 ring-white/50 transition hover:brightness-110 active:scale-95 sm:bottom-4 sm:right-4 sm:h-20 sm:w-20"
        aria-label={t.frontDesk.aria}
        title={t.frontDesk.label}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
          <path
            id="frontdesk-arc"
            d="M 12 56 A 38 38 0 0 1 88 56"
            fill="none"
          />
          <text
            fill="currentColor"
            className="text-[18px] font-bold uppercase tracking-tight"
          >
            <textPath href="#frontdesk-arc" startOffset="50%" textAnchor="middle">
              {t.frontDesk.label}
            </textPath>
          </text>
          {/* Phone receiver icon, centered under the curved label */}
          <g transform="translate(35.5, 58) scale(1.2)">
            <path
              fill="currentColor"
              d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.279-.126.418a11.47 11.47 0 006.336 6.336c.139.038.317.009.418-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
            />
          </g>
        </svg>
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center px-4"
              role="dialog"
              aria-modal="true"
              aria-label={t.frontDesk.label}
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                aria-label={t.frontDesk.label}
                onClick={() => setOpen(false)}
              />
              <section
                className="hm-card relative z-10 flex w-full max-w-sm flex-col items-center gap-4 px-6 py-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3f6339] text-white shadow-sm">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-7 w-7 animate-pulse"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.279-.126.418a11.47 11.47 0 006.336 6.336c.139.038.317.009.418-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                    />
                  </svg>
                </span>
                <p className="text-lg font-semibold leading-snug text-[#3f6339]">
                  {t.frontDesk.connecting}
                </p>
                {room ? (
                  <p className="-mt-2 text-base font-bold text-[#3f6339]/80">
                    {t.frontDesk.roomLabel} {room}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-[#3f6339] px-5 py-2.5 text-base font-bold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98]"
                >
                  OK
                </button>
              </section>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

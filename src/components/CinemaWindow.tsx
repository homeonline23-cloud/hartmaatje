"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  title: string;
  /** Localized line under the title (same language as the app) */
  subtitle?: string;
  waitingLabel: string;
  liveHint: string;
  closeLabel: string;
  onClose: () => void;
  /** Optional left column (e.g. companion/mic). Omit for a quiet, full-width viewer. */
  sidePanel?: ReactNode;
  exampleImageSrc?: string;
  exampleImageAlt?: string;
  exampleBadge?: string;
  /** YouTube (or other) embed URL — plays inside the cinema frame */
  embedUrl?: string | null;
};

/**
 * Cinema frame — video + left companion/mic column, centered on screen.
 * Portaled to document.body so site header cannot steal close clicks.
 */
export function CinemaWindow({
  title,
  subtitle,
  waitingLabel,
  liveHint,
  closeLabel,
  onClose,
  sidePanel,
  exampleImageSrc = "/bioscoop/voorbeeld-landschap.png",
  exampleImageAlt = "Voorbeeld van de Bioscoop Kamer",
  exampleBadge = "Voorbeeld",
  embedUrl = null,
}: Props) {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-6 pt-20 sm:items-end sm:pb-10 sm:pt-24"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label={closeLabel}
        onClick={onClose}
      />

      <section
        className="relative z-10 flex w-full max-w-[calc(40rem-2rem)] flex-col overflow-hidden rounded-[1.75rem] hm-dark p-[0.7rem] shadow-[0_20px_60px_rgba(0,0,0,0.55)] ring-1 ring-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-3 px-1">
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-white drop-shadow-sm sm:text-xl">
              {title}
            </p>
            {subtitle ? (
              <p className="mt-0.5 text-sm leading-snug text-white/85 sm:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="relative z-20 shrink-0 rounded-xl bg-white/95 px-4 py-2 text-base font-bold text-[#3f6339] shadow-sm transition hover:bg-white active:scale-[0.98]"
          >
            {closeLabel}
          </button>
        </div>

        <div className="flex min-h-0 flex-1 gap-2 sm:gap-3">
          {sidePanel ? (
            <aside className="flex w-[5.75rem] shrink-0 flex-col justify-between rounded-[1.15rem] bg-[#0c1f14]/80 px-1.5 py-3 ring-1 ring-white/25 sm:w-[7rem] sm:px-2 sm:py-4">
              {sidePanel}
            </aside>
          ) : null}

          <div className="relative aspect-[16/10] max-h-[min(52vh,520px)] min-w-0 flex-1 overflow-hidden rounded-[1.15rem] bg-[#0c1f14] shadow-[inset_0_0_0_3px_rgba(232,223,208,0.35)]">
            {embedUrl ? (
              <iframe
                title={title}
                src={embedUrl}
                className="absolute inset-0 h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={exampleImageSrc}
                  alt={exampleImageAlt}
                  className="h-full w-full object-cover"
                />

                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent px-4 pb-4 pt-12">
                  <p className="hm-dark inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide">
                    {exampleBadge}
                  </p>
                  <p className="mt-2 text-base font-semibold leading-snug text-white sm:text-lg">
                    {waitingLabel}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-white/90 sm:text-base">
                    {liveHint}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#cfe0c0]">
                    {liveHint}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div
          className="mt-2 h-2 rounded-full bg-gradient-to-r from-[#7a9a6a] via-[#cfe0c0] to-[#7a9a6a] opacity-90"
          aria-hidden
        />
      </section>
    </div>,
    document.body
  );
}

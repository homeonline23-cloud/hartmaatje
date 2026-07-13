"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/context/LanguageContext";
import { useHomeCompanionOptional } from "@/context/HomeCompanionContext";
import { SUPPORTED_LANGUAGES, type AppLang } from "@/lib/languages";

const PANEL_MIN_WIDTH = 196;
const PANEL_MAX_WIDTH = 220;

type LanguagePickerProps = {
  className?: string;
  buttonClassName?: string;
};

export function LanguagePicker({
  className = "",
  buttonClassName = "",
}: LanguagePickerProps) {
  const { lang, copy, setLang } = useLanguage();
  const homeCompanion = useHomeCompanionOptional();
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: PANEL_MIN_WIDTH });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updatePanelPos = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.min(
      PANEL_MAX_WIDTH,
      Math.max(PANEL_MIN_WIDTH, window.innerWidth - 24),
    );
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    setPanelPos({
      top: rect.bottom + 10,
      left,
      width,
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePanelPos();
    const onResize = () => updatePanelPos();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        rootRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const t = window.setTimeout(() => {
      document.addEventListener("mousedown", onPointerDown);
      document.addEventListener("touchstart", onPointerDown);
      document.addEventListener("keydown", onKeyDown);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const pick = (id: AppLang) => {
    if (id === lang) {
      setOpen(false);
      return;
    }
    setLang(id);
    homeCompanion?.resetToCleanHome();
    setOpen(false);
  };

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={rootRef}
            role="dialog"
            aria-modal="true"
            aria-label={copy.langPickerTitle}
            className="fixed z-[200] rounded-2xl border border-[#e8dfd0]/90 bg-[#fcfaf6]/98 p-4 shadow-[0_10px_24px_rgba(44,36,22,0.12)] backdrop-blur-sm"
            style={{
              top: panelPos.top,
              left: panelPos.left,
              width: panelPos.width,
            }}
          >
            <p className="mb-3 text-center text-xl font-bold leading-snug text-[#2c2416]">
              {copy.langPickerTitle}
            </p>

            <div className="space-y-2.5" role="listbox" aria-label={copy.langPickerTitle}>
              {SUPPORTED_LANGUAGES.map((option) => {
                const selected = lang === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => pick(option.id)}
                    className={`flex min-h-[3.25rem] w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-lg font-semibold leading-tight transition ${
                      selected
                        ? "border-[#4a6741] bg-[#eef3ea] text-[#2c4a22] shadow-[inset_0_0_0_1px_#4a6741]"
                        : "border-[#e0d6c6] bg-white text-[#2c2416] hover:border-[#4a6741]/40 hover:bg-[#faf8f4]"
                    }`}
                  >
                    <span>{option.nativeLabel}</span>
                    {selected ? (
                      <span
                        className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4a6741] text-sm font-bold text-white"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full rounded-xl py-2 text-base text-[#8a7a66] transition hover:bg-[#f3ede3]/80 hover:text-[#5c4a32]"
            >
              {copy.langPickerClose}
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`relative min-w-0 ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!open) updatePanelPos();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={
          buttonClassName ||
          "rounded-2xl border-2 border-white/70 bg-white/95 px-4 py-2.5 text-lg font-bold text-[#4a6741] shadow-md transition hover:bg-white"
        }
      >
        <span className="truncate">🌐 {copy.langPickerButton}</span>
      </button>
      {panel}
    </div>
  );
}

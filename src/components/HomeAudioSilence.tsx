"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { silenceHmMedia } from "@/lib/hmMedia";

/**
 * Stop leftover companion / story audio when changing pages.
 * Audio() players are often NOT in the DOM — silenceHmMedia tracks them.
 */
export function HomeAudioSilence() {
  const pathname = usePathname();

  useEffect(() => {
    // Always cancel browser TTS
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }

    // Story audio must never continue after leaving Verhalen (or on refresh)
    if (!pathname.startsWith("/verhalen")) {
      silenceHmMedia("story");
    }

    // Outside live conversation routes, silence everything
    if (
      !pathname.startsWith("/gesprek") &&
      !pathname.startsWith("/maatjes") &&
      !pathname.startsWith("/bioscoop")
    ) {
      silenceHmMedia();
    }
  }, [pathname]);

  // Hard stop on page hide / refresh
  useEffect(() => {
    const kill = () => silenceHmMedia();
    window.addEventListener("pagehide", kill);
    window.addEventListener("beforeunload", kill);
    return () => {
      window.removeEventListener("pagehide", kill);
      window.removeEventListener("beforeunload", kill);
    };
  }, []);

  // Typing in any field stops leftover story speech immediately
  useEffect(() => {
    const onType = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || t.isContentEditable) {
        silenceHmMedia("story");
      }
    };
    window.addEventListener("keydown", onType, true);
    window.addEventListener("input", onType, true);
    return () => {
      window.removeEventListener("keydown", onType, true);
      window.removeEventListener("input", onType, true);
    };
  }, []);

  return null;
}

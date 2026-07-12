"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { CompanionPhase } from "@/components/CompanionPanel";
import { clearGuestMessages } from "@/lib/guestChat";
import { clearFennaMessages } from "@/lib/fennaChat";
import type { NatureScene } from "@/lib/natureShowcase";
import { stopFennaAudio } from "@/lib/fenna-voice/playback";
import { endCompanionVoiceSession } from "@/lib/fenna-voice/sessionControl";
import { stopHartMaatjeSpeech } from "@/lib/voice";

type HomeCompanionContextValue = {
  companionPhase: CompanionPhase;
  welcomePlayNonce: number;
  sessionKey: number;
  natureScene: NatureScene | null;
  startWelcome: (hasVideo: boolean) => void;
  completeWelcome: () => void;
  closeCompanion: () => void;
  showNatureScene: (scene: NatureScene) => void;
  hideNatureScene: () => void;
  resetToCleanHome: () => void;
};

const HomeCompanionContext = createContext<HomeCompanionContextValue | null>(
  null,
);

export function HomeCompanionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [companionPhase, setCompanionPhase] =
    useState<CompanionPhase>("idle");
  const [welcomePlayNonce, setWelcomePlayNonce] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);
  const [natureScene, setNatureScene] = useState<NatureScene | null>(null);

  const startWelcome = useCallback((hasVideo: boolean) => {
    stopHartMaatjeSpeech();
    if (!hasVideo) {
      setCompanionPhase("present");
      return;
    }
    setWelcomePlayNonce((n) => n + 1);
    setCompanionPhase("welcoming");
  }, []);

  const completeWelcome = useCallback(() => {
    setCompanionPhase("present");
  }, []);

  const closeCompanion = useCallback(() => {
    stopHartMaatjeSpeech();
    setNatureScene(null);
    setCompanionPhase("idle");
  }, []);

  const showNatureScene = useCallback((scene: NatureScene) => {
    setNatureScene(scene);
    setCompanionPhase("present");
  }, []);

  const hideNatureScene = useCallback(() => {
    setNatureScene(null);
  }, []);

  const resetToCleanHome = useCallback(() => {
    endCompanionVoiceSession();
    stopHartMaatjeSpeech();
    clearGuestMessages();
    clearFennaMessages();
    setNatureScene(null);
    setCompanionPhase("idle");
    setSessionKey((k) => k + 1);
  }, []);

  const value = useMemo(
    () => ({
      companionPhase,
      welcomePlayNonce,
      sessionKey,
      natureScene,
      startWelcome,
      completeWelcome,
      closeCompanion,
      showNatureScene,
      hideNatureScene,
      resetToCleanHome,
    }),
    [
      companionPhase,
      welcomePlayNonce,
      sessionKey,
      natureScene,
      startWelcome,
      completeWelcome,
      closeCompanion,
      showNatureScene,
      hideNatureScene,
      resetToCleanHome,
    ],
  );

  return (
    <HomeCompanionContext.Provider value={value}>
      {children}
    </HomeCompanionContext.Provider>
  );
}

export function useHomeCompanion() {
  const ctx = useContext(HomeCompanionContext);
  if (!ctx) {
    throw new Error(
      "useHomeCompanion moet binnen HomeCompanionProvider gebruikt worden",
    );
  }
  return ctx;
}

/** Header en andere plekken buiten het gesprek. */
export function useHomeCompanionOptional() {
  return useContext(HomeCompanionContext);
}

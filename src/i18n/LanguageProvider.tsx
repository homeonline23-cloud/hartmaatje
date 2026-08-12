"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_APP_LANG,
  LANG_STORAGE_KEY,
  LOCALES,
  detectBrowserAppLang,
  isAppLang,
  toBcp47,
  type AppLang,
} from "@/i18n/config";
import { getMessages, type Messages } from "@/i18n/messages";
import {
  PROFILE_STORAGE_KEY,
  loadProfile,
  saveProfile,
} from "@/lib/profileStorage";

type I18nContextValue = {
  lang: AppLang;
  locale: string;
  dir: "ltr" | "rtl";
  t: Messages;
  ready: boolean;
  setLang: (lang: AppLang) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function persistLang(lang: AppLang) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.cookie = `${LANG_STORAGE_KEY}=${lang};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    /* ignore */
  }
  // Keep profile language field in sync with the central language bar.
  try {
    const profile = loadProfile();
    if (profile.language !== lang) {
      saveProfile({ ...profile, language: lang });
    }
  } catch {
    /* ignore */
  }
}

function readSavedLang(): AppLang | null {
  try {
    const fromStorage = localStorage.getItem(LANG_STORAGE_KEY);
    if (isAppLang(fromStorage)) return fromStorage;
  } catch {
    /* ignore */
  }
  try {
    const profileLang = loadProfile().language;
    if (isAppLang(profileLang)) return profileLang;
  } catch {
    /* ignore */
  }
  return null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AppLang>(DEFAULT_APP_LANG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("lang");
      if (isAppLang(q)) {
        setLangState(q);
        persistLang(q);
        setReady(true);
        return;
      }
    } catch {
      /* ignore */
    }

    const saved = readSavedLang();
    if (saved) {
      setLangState(saved);
      setReady(true);
      return;
    }

    const detected = detectBrowserAppLang();
    setLangState(detected);
    persistLang(detected);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = toBcp47(lang);
    document.documentElement.dir = LOCALES[lang].dir;
    // Always short brand only — never a tagline with "digitaal/digital"
    document.title = "HartMaatje";
  }, [lang, ready]);

  // Cross-tab / storage sync so language stays one source of truth.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LANG_STORAGE_KEY && isAppLang(e.newValue)) {
        setLangState(e.newValue);
      }
      if (e.key === PROFILE_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as { language?: string };
          if (isAppLang(parsed.language)) setLangState(parsed.language);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setLang = useCallback((next: AppLang) => {
    setLangState(next);
    persistLang(next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      locale: toBcp47(lang),
      dir: LOCALES[lang].dir,
      t: getMessages(lang),
      ready,
      setLang,
    }),
    [lang, ready, setLang]
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within LanguageProvider");
  }
  return ctx;
}

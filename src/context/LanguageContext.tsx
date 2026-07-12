"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getAppCopy, type AppCopy, type HomeCopy } from "@/lib/appLocale";
import {
  DEFAULT_APP_LANG,
  detectBrowserAppLang,
  isAppLang,
  loadSavedAppLang,
  saveAppLang,
  type AppLang,
} from "@/lib/languages";

const STORAGE_KEY = "hartmaatje_lang";

type LanguageContextValue = {
  lang: AppLang;
  /** Home-teksten (kort pad). */
  copy: HomeCopy;
  /** Volledige app-teksten in de gekozen taal. */
  app: AppCopy;
  setLang: (lang: AppLang) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

type LanguageProviderProps = {
  children: React.ReactNode;
  /** From server cookie — keeps SSR and client in sync (no hydration mismatch). */
  initialLang?: AppLang;
};

export function LanguageProvider({
  children,
  initialLang = DEFAULT_APP_LANG,
}: LanguageProviderProps) {
  const [lang, setLangState] = useState<AppLang>(initialLang);

  const app = useMemo(() => getAppCopy(lang), [lang]);
  const copy = app.home;

  useEffect(() => {
    const saved = loadSavedAppLang();
    if (saved) {
      if (saved !== lang) {
        setLangState(saved);
        saveAppLang(saved);
      }
      return;
    }
    const hasCookie = document.cookie.includes(`${STORAGE_KEY}=`);
    if (!hasCookie) {
      const detected = detectBrowserAppLang();
      if (detected !== lang) {
        setLangState(detected);
        saveAppLang(detected);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = app.meta.title;
  }, [lang, app.meta.title]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      if (isAppLang(event.newValue)) setLangState(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setLang = useCallback((next: AppLang) => {
    saveAppLang(next);
    setLangState(next);
  }, []);

  const value = useMemo(
    () => ({ lang, copy, app, setLang }),
    [app, copy, lang, setLang],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage moet binnen LanguageProvider gebruikt worden");
  }
  return ctx;
}

/** SSR / buiten provider: veilige fallback. */
export function useLanguageOptional(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  const fallbackApp = getAppCopy(DEFAULT_APP_LANG);
  return (
    ctx ?? {
      lang: DEFAULT_APP_LANG,
      copy: fallbackApp.home,
      app: fallbackApp,
      setLang: () => {},
    }
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Locale } from "@/models/types";
import {
  DEFAULT_LOCALE,
  TRANSLATIONS,
  translate,
  type TranslationDict,
} from "./translations";

interface LocaleContextValue {
  locale: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  t: (key) => key,
  setLocale: () => {},
});

const STORAGE_KEY = "savings-goal-tracker:locale";

let clientLocale: Locale = DEFAULT_LOCALE;
const localeListeners = new Set<() => void>();

function emitLocale() {
  for (const l of localeListeners) l();
}

function subscribeLocale(listener: () => void): () => void {
  localeListeners.add(listener);
  return () => localeListeners.delete(listener);
}

function getLocaleSnapshot(): Locale {
  return clientLocale;
}

function getLocaleServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

function readPersistedLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "id" || stored === "en") return stored;
  } catch {
    // ignore
  }
  return DEFAULT_LOCALE;
}

function applyLocale(next: Locale): void {
  clientLocale = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }
  emitLocale();
}

export function LocaleProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    getLocaleServerSnapshot,
  );

  useEffect(() => {
    const persisted = readPersistedLocale();
    if (persisted !== clientLocale) {
      applyLocale(persisted);
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const dict: TranslationDict =
        TRANSLATIONS[locale] ?? TRANSLATIONS[DEFAULT_LOCALE];
      return translate(dict, key, params);
    },
    [locale],
  );

  const setLocale = useCallback((next: Locale) => {
    applyLocale(next);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

"use client";

import { ConfigProvider, theme } from "antd";
import idID from "antd/locale/id_ID";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  /** true setelah mode klien selesai dihidrasi. */
  hydrated: boolean;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  hydrated: false,
  toggle: () => {},
  setMode: () => {},
});

const STORAGE_KEY = "savings-goal-tracker:theme";

// --- Module-level store agar server dan render awal client selalu sama ---
let clientMode: ThemeMode = "light";
let clientHydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getModeSnapshot(): ThemeMode {
  return clientMode;
}

function getHydratedSnapshot(): boolean {
  return clientHydrated;
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

function getServerHydrated(): boolean {
  return false;
}

function readPersistedMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // ignore
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyMode(next: ThemeMode): void {
  clientMode = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }
  const root = document.documentElement;
  if (next === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  emit();
}

/**
 * Provider tema aplikasi.
 * - Mengelola state light/dark (persist ke localStorage, default preferensi sistem).
 * - Mengeset class `dark` pada <html> agar Tailwind dark: variant aktif.
 * - Menyuplai antd ConfigProvider dengan algoritma tema yang sesuai.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(
    subscribe,
    getModeSnapshot,
    getServerSnapshot,
  );
  const hydrated = useSyncExternalStore(
    subscribe,
    getHydratedSnapshot,
    getServerHydrated,
  );

  useEffect(() => {
    const persisted = readPersistedMode();
    if (persisted !== clientMode) {
      applyMode(persisted);
    } else {
      const root = document.documentElement;
      if (persisted === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
    }
    clientHydrated = true;
    emit();
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    applyMode(next);
  }, []);

  const toggle = useCallback(() => {
    applyMode(clientMode === "light" ? "dark" : "light");
  }, []);

  const isDark = mode === "dark";

  return (
    <ThemeContext.Provider value={{ mode, hydrated, toggle, setMode }}>
      <ConfigProvider
        locale={idID}
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: "#6366f1",
            borderRadius: 10,
            fontFamily:
              "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

/** Hook untuk mengakses state & aksi tema. */
export function useThemeMode(): ThemeContextValue {
  return useContext(ThemeContext);
}

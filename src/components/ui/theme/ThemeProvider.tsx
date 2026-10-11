"use client";

import { App, ConfigProvider, theme } from "antd";
import idID from "antd/locale/id_ID";
import enUS from "antd/locale/en_US";
import dayjs from "dayjs";
import "dayjs/locale/id";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { THEME_COOKIE } from "@/utils/config/variables";

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

// --- Module-level store ---
// `clientMode` hanya dimutasi lewat applyMode (effect/handler), tidak pernah
// saat render. Sebelum hidrasi selesai, render memakai `initialMode` (cookie,
// dibaca server) sehingga HTML SSR dan hidrasi pertama identik — style antd
// dari server sudah bertema benar (tidak ada flash putih saat dark mode).
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

/** Persist tema ke localStorage + cookie (cookie dibaca SSR). */
function persistMode(next: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }
  try {
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // ignore
  }
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
  persistMode(next);
  const root = document.documentElement;
  if (next === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  // Sinkron dengan script pre-hydration di root layout (scrollbar natif,
  // form control, dll mengikuti tema).
  root.style.colorScheme = next;
  emit();
}

/**
 * Provider tema aplikasi.
 * - Mengelola state light/dark (persist ke localStorage + cookie, default
 *   preferensi sistem).
 * - `initialMode` dibaca dari cookie THEME_COOKIE di server layout dan
 *   dipakai untuk render SSR + hidrasi pertama — style antd dari server
 *   sudah bertema benar sehingga tidak ada flash putih saat dark mode.
 * - Mengeset class `dark` pada <html> agar Tailwind dark: variant aktif.
 * - Menyuplai antd ConfigProvider dengan algoritma tema yang sesuai.
 */
export function ThemeProvider({
  children,
  initialMode = "light",
}: {
  children: ReactNode;
  /** Tema awal dari cookie (SSR) — fallback "light". */
  initialMode?: ThemeMode;
}) {
  // Seed store sekali sebelum snapshot pertama dibaca, agar hidrasi client
  // identik dengan HTML server (yang dirender memakai initialMode).
  const getServerMode = useCallback(() => initialMode, [initialMode]);
  const storedMode = useSyncExternalStore(
    subscribe,
    getModeSnapshot,
    getServerMode,
  );
  const hydrated = useSyncExternalStore(
    subscribe,
    getHydratedSnapshot,
    () => false,
  );
  // Sebelum hidrasi selesai, pakai tema cookie (sama dengan SSR); setelahnya
  // pakai store (sumber kebenaran di klien).
  const mode: ThemeMode = hydrated ? storedMode : initialMode;
  const { locale } = useLocale();

  useEffect(() => {
    dayjs.locale(locale === "id" ? "id" : "en");
  }, [locale]);

  useEffect(() => {
    // Sinkron dengan script pre-hydration di root layout (sudah menset
    // class & colorScheme sebelum paint); applyMode memastikan state
    // internal + DOM konsisten setelah hidrasi (localStorage tetap sumber
    // kebenaran di klien — bila beda dari cookie, tema digeser di sini).
    applyMode(readPersistedMode());
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
        locale={locale === "id" ? idID : enUS}
        theme={{
          /*
           * Key cssVar WAJIB berbeda per tema (light/dark). Tanpa ini,
           * class `css-var-*` pada elemen identik antar tema sehingga blok
           * variabel tema lama (mis. hasil hidrasi) dapat menang cascade
           * atas blok baru — menyebabkan bg `.ant-layout` tidak ikut
           * berubah saat toggle dark mode sampai halaman di-refresh.
           */
          cssVar: { key: isDark ? "dark" : "light" },
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: "#4f46e5",
            /*
             * Kanvas layout antd disamakan dengan variabel Tailwind
             * `--background` di src/assets/global/index.css
             * (terang: #f5f5f7, gelap: #0a0a0b) sehingga permukaan
             * halaman kedua sistem tema selalu selaras. Container/elevated
             * tetap diturunkan algoritma antd (kontras dengan kanvas).
             */
            colorBgLayout: isDark ? "#0a0a0b" : "#f5f5f7",
            // Gelapkan teks sekunder pada mode terang agar rasio kontras warna
            // memenuhi WCAG AA (>= 4.5:1) untuk Statistic title & Typography.
            ...(isDark ? {} : { colorTextSecondary: "#595959" }),
            borderRadius: 10,
            fontFamily:
              "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

/** Hook untuk mengakses state & aksi tema. */
export function useThemeMode(): ThemeContextValue {
  return useContext(ThemeContext);
}

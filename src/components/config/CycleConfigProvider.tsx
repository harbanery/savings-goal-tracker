"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { CYCLE_START_DAY } from "@/config/variables";

interface CycleConfigValue {
  /** Tanggal mulai siklus per bulan (1-28). */
  startDay: number;
  /** true setelah nilai klien dihidrasi. */
  hydrated: boolean;
  setStartDay: (day: number) => void;
}

const CycleConfigContext = createContext<CycleConfigValue>({
  startDay: CYCLE_START_DAY,
  hydrated: false,
  setStartDay: () => {},
});

const STORAGE_KEY = "savings-goal-tracker:cycle-start-day";

let clientStartDay: number = CYCLE_START_DAY;
let clientHydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getStartDaySnapshot(): number {
  return clientStartDay;
}

function getHydratedSnapshot(): boolean {
  return clientHydrated;
}

function getServerSnapshot(): number {
  return CYCLE_START_DAY;
}

function getServerHydrated(): boolean {
  return false;
}

function readPersistedStartDay(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = Number(stored);
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 28) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return CYCLE_START_DAY;
}

function applyStartDay(next: number): void {
  clientStartDay = next;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // ignore
  }
  emit();
}

export function CycleConfigProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const startDay = useSyncExternalStore(
    subscribe,
    getStartDaySnapshot,
    getServerSnapshot,
  );
  const hydrated = useSyncExternalStore(
    subscribe,
    getHydratedSnapshot,
    getServerHydrated,
  );

  useEffect(() => {
    const persisted = readPersistedStartDay();
    if (persisted !== clientStartDay) {
      applyStartDay(persisted);
    }
    clientHydrated = true;
    emit();
  }, []);

  const setStartDay = useCallback((day: number) => {
    if (Number.isInteger(day) && day >= 1 && day <= 28) {
      applyStartDay(day);
    }
  }, []);

  return (
    <CycleConfigContext.Provider value={{ startDay, hydrated, setStartDay }}>
      {children}
    </CycleConfigContext.Provider>
  );
}

export function useCycleConfig(): CycleConfigValue {
  return useContext(CycleConfigContext);
}

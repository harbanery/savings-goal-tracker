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
import { getCycleInfo, getCurrentCycle, type CycleInfo } from "@/features/web/utils/cycle";

/**
 * Store siklus GLOBAL (dipakai navbar & seluruh halaman keuangan).
 * Navigasi siklus kini lewat DatePicker month di header — semua halaman
 * (Dashboard, Transaksi, Laporan) membaca siklus aktif dari sini.
 */

interface CycleContextValue {
  /** Siklus aktif (bulanan). */
  cycle: CycleInfo;
  /** Ganti siklus aktif. */
  setCycle: (cycle: CycleInfo) => void;
  /** Tanggal mulai siklus user (1-28, dari settings). */
  startDay: number;
}

const CycleContext = createContext<CycleContextValue | null>(null);

export function CycleProvider({
  startDay,
  children,
}: {
  startDay: number;
  children: ReactNode;
}) {
  const [cycle, setCycleState] = useState<CycleInfo>(() =>
    getCurrentCycle(startDay),
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // startDay berubah (mis. diedit di halaman Budget) → turunkan ulang
    // batas tanggal siklus tanpa mengubah bulan yang sedang dipilih.
    setCycleState((prev) => getCycleInfo(prev.year, prev.monthIndex, startDay));
  }, [startDay]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const setCycle = useCallback((next: CycleInfo) => {
    setCycleState(next);
  }, []);

  const value = useMemo(
    () => ({ cycle, setCycle, startDay }),
    [cycle, setCycle, startDay],
  );

  return <CycleContext.Provider value={value}>{children}</CycleContext.Provider>;
}

/** Akses siklus aktif global (navbar picker + halaman keuangan). */
export function useCycle(): CycleContextValue {
  const ctx = useContext(CycleContext);
  if (!ctx) {
    throw new Error("useCycle harus dipakai di dalam <CycleProvider>.");
  }
  return ctx;
}

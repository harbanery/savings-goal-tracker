import type { Transaction } from "@/features/web/types";
import type { Locale } from "@/types/locale";
import {
  formatCycleLabel,
  getCycleForDate,
  getCycleInfo,
  type CycleInfo,
} from "@/features/web/utils/cycle";

/**
 * Data satu siklus untuk chart historis (sadar EXPENSE/INCOME/TRANSFER).
 */
export interface CycleChartData {
  /** Kunci netral locale, mis. "2026-08". */
  key: string;
  /** Label tampilan sesuai locale, mis. "Agustus 2026". */
  label: string;
  savingsInitial: number;
  totalSpent: number;
  totalIncome: number;
  /** Target tabungan per siklus = tabungan dilindungi (settings user). */
  expectedSavings: number;
  /** Tabungan aktual per siklus = pemasukan − pengeluaran. */
  actualSavings: number;
  /** Kumulatif target: saldo awal + Σ target tabungan tiap siklus. */
  cumulativeExpected: number;
  /** Kumulatif aktual: saldo awal + Σ (pemasukan − pengeluaran). */
  cumulativeActual: number;
  /** Pengeluaran per kategori (categoryId -> amount, EXPENSE saja). */
  categorySpent: Record<string, number>;
}

/** Parse kunci netral "YYYY-MM" menjadi sort key numerik kronologis. */
function keyToSortKey(key: string): number {
  const parts = key.split("-");
  if (parts.length !== 2) return 0;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return 0;
  return year * 12 + (month - 1);
}

/** Ambil tahun & index bulan dari kunci netral "YYYY-MM". */
function keyToParts(key: string): { year: number; monthIndex: number } | null {
  const parts = key.split("-");
  if (parts.length !== 2) return null;
  const year = Number(parts[0]);
  const monthIndex = Number(parts[1]) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return null;
  return { year, monthIndex };
}

/**
 * Ubah map key -> transactions menjadi array CycleChartData terurut kronologis.
 * @param historical map dengan kunci netral "YYYY-MM"
 * @param protectedSavings tabungan dilindungi per siklus (target tabungan)
 * @param savingsInitial saldo awal per siklus milik user
 * @param locale locale untuk label tampilan
 */
export function buildCycleChartData(
  historical: Record<string, Transaction[]>,
  protectedSavings: number,
  savingsInitial: number,
  locale: Locale = "id",
): CycleChartData[] {
  const keys = Object.keys(historical).sort(
    (a, b) => keyToSortKey(a) - keyToSortKey(b),
  );
  /** Akumulator tabungan kumulatif (running, kronologis). */
  let cumulativeExpected = 0;
  let cumulativeActual = 0;
  return keys.map((key) => {
    const transactions = historical[key] ?? [];
    let totalSpent = 0;
    let totalIncome = 0;
    const categorySpent: Record<string, number> = {};
    for (const tr of transactions) {
      if (tr.type === "EXPENSE") {
        totalSpent += tr.amount;
        categorySpent[tr.categoryId] =
          (categorySpent[tr.categoryId] ?? 0) + tr.amount;
      } else if (tr.type === "INCOME") {
        totalIncome += tr.amount;
      }
      // TRANSFER tidak mengubah total saldo.
    }
    const parts = keyToParts(key);
    const label = parts
      ? formatCycleLabel(parts.year, parts.monthIndex, locale)
      : key;
    // Target tabungan per siklus = tabungan dilindungi. Rumus lama
    // (saldo awal − total alokasi wadah) menghasilkan 0 ketika seluruh
    // saldo dialokasikan sehingga chart target tampak kosong (insight
    // DROID.md). Aktual = tabungan bersih siklus (tanpa saldo awal).
    const expectedSavings = protectedSavings;
    const actualSavings = totalIncome - totalSpent;
    // Kumulatif = saldo awal + Σ tabungan tiap siklus (target maupun
    // aktual); saldo awal tidak diulang per siklus agar tak dobel hitung.
    cumulativeExpected += expectedSavings;
    cumulativeActual += actualSavings;
    return {
      key,
      label,
      savingsInitial,
      totalSpent,
      totalIncome,
      expectedSavings,
      actualSavings,
      cumulativeExpected: savingsInitial + cumulativeExpected,
      cumulativeActual: savingsInitial + cumulativeActual,
      categorySpent,
    };
  });
}

/**
 * Kelompokkan transaksi menjadi map kunci siklus -> transaksi
 * (untuk membentuk data historis in-memory di client).
 */
export function groupTransactionsByCycle(
  transactions: Transaction[],
  startDay?: number,
): Record<string, Transaction[]> {
  const result: Record<string, Transaction[]> = {};
  for (const tr of transactions) {
    const d = new Date(tr.date);
    if (Number.isNaN(d.getTime())) continue;
    const key = getCycleForDate(d, startDay).key;
    (result[key] ??= []).push(tr);
  }
  return result;
}

/**
 * Data satu hari untuk line chart pengeluaran harian.
 */
export interface DailySpendingPoint {
  /** Label tanggal (ISO "YYYY-MM-DD") untuk grouping/stabil. */
  key: string;
  /** Label tampilan sesuai locale, mis. "5 Agu". */
  label: string;
  /** Total pengeluaran pada tanggal tersebut. */
  amount: number;
  /** Jumlah transaksi pada tanggal tersebut. */
  count: number;
}

/** Buat label tanggal singkat sesuai locale, mis. "5 Agu" (id) / "5 Aug" (en). */
function formatShortDayLabel(iso: string, locale: Locale): string {
  const date = new Date(iso + "T00:00:00");
  const day = date.getDate();
  const monthIndex = date.getMonth();
  const SHORT_MONTHS: Record<Locale, string[]> = {
    id: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  };
  const months = SHORT_MONTHS[locale] ?? SHORT_MONTHS.id;
  return `${day} ${months[monthIndex]}`;
}

/** Konversi Date/string ke ISO "YYYY-MM-DD" (hanya tanggal, tanpa zona). */
function toISODate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Jumlah hari antara dua tanggal (inklusif). */
function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

/**
 * Bangun data pengeluaran harian untuk line chart (EXPENSE saja).
 * Hari tanpa transaksi tetap dimunculkan dengan nilai 0 agar garis kontinu.
 */
export function buildDailySpending(
  transactions: Transaction[],
  cycle: CycleInfo,
  locale: Locale = "id",
): DailySpendingPoint[] {
  const totalDays = daysBetween(cycle.startDate, cycle.endDate);
  const dayMap = new Map<string, { amount: number; count: number }>();

  for (const tr of transactions) {
    if (tr.type !== "EXPENSE") continue;
    const iso = toISODate(tr.date);
    if (!iso) continue;
    let entry = dayMap.get(iso);
    if (!entry) {
      entry = { amount: 0, count: 0 };
      dayMap.set(iso, entry);
    }
    entry.amount += tr.amount;
    entry.count += 1;
  }

  const points: DailySpendingPoint[] = [];
  const base = new Date(cycle.startDate);
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    const iso = toISODate(d);
    const entry = dayMap.get(iso);
    points.push({
      key: iso,
      label: formatShortDayLabel(iso, locale),
      amount: entry?.amount ?? 0,
      count: entry?.count ?? 0,
    });
  }

  return points;
}

/**
 * Versi tanpa cycle eksplisit: turunkan info siklus dari tahun & monthIndex.
 */
export function buildDailySpendingFromYearMonth(
  transactions: Transaction[],
  year: number,
  monthIndex: number,
  locale: Locale = "id",
): DailySpendingPoint[] {
  const cycle = getCycleInfo(year, monthIndex);
  return buildDailySpending(transactions, cycle, locale);
}

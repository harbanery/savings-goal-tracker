import { getParentCategoryId, TOTAL_ALLOCATION } from "@/models/categories";
import type { Locale, Purchase } from "@/models/types";
import {
  formatCycleLabel,
  getCycleInfo,
  type CycleInfo,
} from "@/utils/cycleUtils";
import { SAVINGS_INITIAL } from "@/config/variables";

/**
 * Batas bawah siklus yang ditampilkan di chart: Agustus 2026.
 * Bulan sebelum Agustus 2026 dikosongkan (totalSpent = 0, savings = saldo awal).
 */
const MIN_CHART_SORT_KEY = 2026 * 12 + 7; // Agustus 2026 (monthIndex 7)

/**
 * Data satu siklus untuk chart historis.
 */
export interface CycleChartData {
  /** Kunci netral locale, mis. "2026-08". */
  key: string;
  /** Label tampilan sesuai locale, mis. "Agustus 2026". */
  label: string;
  savingsInitial: number;
  totalSpent: number;
  /** Expected savings = savingsInitial - totalAllocation. */
  expectedSavings: number;
  /** Actual savings = savingsInitial - totalSpent. */
  actualSavings: number;
  /** Pengeluaran per kategori (categoryId -> amount). */
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
 * Ubah map key -> purchases menjadi array CycleChartData yang terurut
 * secara kronologis. Bulan sebelum Agustus 2026 dikosongkan
 * (totalSpent = 0, categorySpent = {}).
 * @param historical map dengan kunci netral "YYYY-MM"
 * @param locale locale untuk label tampilan
 */
export function buildCycleChartData(
  historical: Record<string, Purchase[]>,
  locale: Locale = "id",
): CycleChartData[] {
  const keys = Object.keys(historical).sort(
    (a, b) => keyToSortKey(a) - keyToSortKey(b),
  );
  return keys.map((key) => {
    const sortKey = keyToSortKey(key);
    const purchases =
      sortKey < MIN_CHART_SORT_KEY ? [] : historical[key] ?? [];
    let totalSpent = 0;
    const categorySpent: Record<string, number> = {};
    for (const p of purchases) {
      totalSpent += p.amount;
      // Akumulasi per kategori/wadah induk (legacy-aware).
      const catId = getParentCategoryId(p.categoryId);
      categorySpent[catId] = (categorySpent[catId] ?? 0) + p.amount;
    }
    const parts = keyToParts(key);
    const label = parts
      ? formatCycleLabel(parts.year, parts.monthIndex, locale)
      : key;
    // Sebelum Agustus 2026, expected & actual savings dipaksa 0.
    const isBeforeMin = sortKey < MIN_CHART_SORT_KEY;
    return {
      key,
      label,
      savingsInitial: SAVINGS_INITIAL,
      totalSpent,
      expectedSavings: isBeforeMin ? 0 : SAVINGS_INITIAL - TOTAL_ALLOCATION,
      actualSavings: isBeforeMin ? 0 : SAVINGS_INITIAL - totalSpent,
      categorySpent,
    };
  });
}

/**
 * Hitung cumulative savings (running total) dari expected vs actual.
 */
export function buildCumulativeSavings(
  cycles: CycleChartData[],
): { labels: string[]; expected: number[]; actual: number[] } {
  const labels: string[] = [];
  const expected: number[] = [];
  const actual: number[] = [];
  let expRunning = 0;
  let actRunning = 0;
  for (const c of cycles) {
    expRunning += c.expectedSavings;
    actRunning += c.actualSavings;
    labels.push(c.label);
    expected.push(expRunning);
    actual.push(actRunning);
  }
  return { labels, expected, actual };
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
    id: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ],
    en: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
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
 * Bangun data pengeluaran harian untuk line chart.
 * - Sumbu X: tanggal dalam rentang siklus.
 * - Sumbu Y: total pengeluaran pada tanggal tersebut.
 *
 * Hari tanpa transaksi tetap dimunculkan dengan nilai 0 agar garis kontinu.
 *
 * @param purchases daftar pembelian dalam siklus
 * @param cycle info siklus untuk menentukan rentang tanggal
 * @param locale locale untuk label tampilan
 */
export function buildDailySpending(
  purchases: Purchase[],
  cycle: CycleInfo,
  locale: Locale = "id",
): DailySpendingPoint[] {
  const totalDays = daysBetween(cycle.startDate, cycle.endDate);
  const dayMap = new Map<string, { amount: number; count: number }>();

  for (const p of purchases) {
    const iso = toISODate(p.date);
    if (!iso) continue;
    let entry = dayMap.get(iso);
    if (!entry) {
      entry = { amount: 0, count: 0 };
      dayMap.set(iso, entry);
    }
    entry.amount += p.amount;
    entry.count += 1;
  }

  const points: DailySpendingPoint[] = [];
  // Iterasi seluruh tanggal dalam rentang siklus untuk kontinuitas garis.
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
 * Berguna bila pemanggil hanya punya data tanggal pembelian.
 */
export function buildDailySpendingFromYearMonth(
  purchases: Purchase[],
  year: number,
  monthIndex: number,
  locale: Locale = "id",
): DailySpendingPoint[] {
  const cycle = getCycleInfo(year, monthIndex);
  return buildDailySpending(purchases, cycle, locale);
}

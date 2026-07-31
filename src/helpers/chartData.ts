import { TOTAL_ALLOCATION } from "@/models/categories";
import type { Locale, Purchase } from "@/models/types";
import { formatCycleLabel } from "@/utils/cycleUtils";
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
      categorySpent[p.categoryId] =
        (categorySpent[p.categoryId] ?? 0) + p.amount;
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

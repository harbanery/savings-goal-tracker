import { TOTAL_ALLOCATION } from "@/models/categories";
import type { Purchase } from "@/models/types";
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

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** Parse label "Agustus 2026" menjadi sort key numerik kronologis. */
function labelToSortKey(label: string): number {
  const parts = label.split(" ");
  if (parts.length !== 2) return 0;
  const monthIdx = MONTH_NAMES_ID.indexOf(parts[0]);
  const year = Number(parts[1]);
  if (monthIdx < 0 || !Number.isFinite(year)) return 0;
  return year * 12 + monthIdx;
}

/**
 * Ubah map label -> purchases menjadi array CycleChartData yang terurut
 * secara kronologis. Bulan sebelum Agustus 2026 dikosongkan
 * (totalSpent = 0, categorySpent = {}).
 */
export function buildCycleChartData(
  historical: Record<string, Purchase[]>,
): CycleChartData[] {
  const labels = Object.keys(historical).sort(
    (a, b) => labelToSortKey(a) - labelToSortKey(b),
  );
  return labels.map((label) => {
    const sortKey = labelToSortKey(label);
    const purchases = sortKey < MIN_CHART_SORT_KEY ? [] : historical[label] ?? [];
    let totalSpent = 0;
    const categorySpent: Record<string, number> = {};
    for (const p of purchases) {
      totalSpent += p.amount;
      categorySpent[p.categoryId] = (categorySpent[p.categoryId] ?? 0) + p.amount;
    }
    return {
      label,
      savingsInitial: SAVINGS_INITIAL,
      totalSpent,
      expectedSavings: SAVINGS_INITIAL - TOTAL_ALLOCATION,
      actualSavings: SAVINGS_INITIAL - totalSpent,
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

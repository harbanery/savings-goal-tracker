import { TOTAL_ALLOCATION } from "@/models/categories";
import type { Purchase } from "@/models/types";
import { SAVINGS_INITIAL } from "@/config/variables";

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

/**
 * Ubah map label -> purchases menjadi array CycleChartData yang terurut.
 */
export function buildCycleChartData(
  historical: Record<string, Purchase[]>,
): CycleChartData[] {
  const labels = Object.keys(historical).sort();
  return labels.map((label) => {
    const purchases = historical[label] ?? [];
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

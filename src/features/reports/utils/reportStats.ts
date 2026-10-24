import { getParentCategoryId } from "@/features/web/utils/categories";
import type {
  BudgetCategory,
  Transaction,
} from "@/features/web/types";

/**
 * Statistik Laporan (rekomendasi D7 — rekomendasi_feature.md).
 *
 * - compareCyclesByCategory: pengeluaran per wadah siklus ini vs siklus
 *   sebelumnya (persentase naik/turun) — murni kalkulasi dari daftar
 *   transaksi yang sudah diambil (pola A8: 1 query rentang lalu
 *   dikelompokkan di memori).
 * - getQuickInsights: insight murah lintas rentang — hari paling boros,
 *   rata-rata per transaksi, rasio tetap vs variabel.
 */

/** Baris perbandingan pengeluaran satu wadah antar dua siklus. */
export interface CategoryComparison {
  categoryId: string;
  name: string;
  color: string;
  /** Total pengeluaran (EXPENSE) wadah ini di siklus aktif. */
  current: number;
  /** Total pengeluaran wadah ini di siklus sebelumnya. */
  previous: number;
  /** Selisih current − previous. */
  diff: number;
  /** Perubahan vs previous dalam persen (null bila previous = 0). */
  pct: number | null;
  /** true bila previous = 0 dan current > 0 (wadah baru dipakai). */
  isNew: boolean;
}

/** Hasil perbandingan dua siklus (per wadah + total). */
export interface CycleComparison {
  rows: CategoryComparison[];
  total: {
    current: number;
    previous: number;
    diff: number;
    pct: number | null;
  };
}

/** Tambahkan nominal EXPENSE ke peta per-wadah (key = id wadah induk). */
function accumulateByCategory(
  transactions: Transaction[],
  categories: BudgetCategory[],
  target: Map<string, number>,
): void {
  for (const tr of transactions) {
    if (tr.type !== "EXPENSE") continue;
    const catId = getParentCategoryId(categories, tr.categoryId);
    target.set(catId, (target.get(catId) ?? 0) + tr.amount);
  }
}

/**
 * Bandingkan pengeluaran per wadah antara dua siklus.
 * Hanya wadah dengan pengeluaran di salah satu siklus yang dikembalikan,
 * diurutkan dari pengeluaran siklus aktif terbesar.
 */
export function compareCyclesByCategory(
  currentTransactions: Transaction[],
  previousTransactions: Transaction[],
  categories: BudgetCategory[],
): CycleComparison {
  const current = new Map<string, number>();
  const previous = new Map<string, number>();
  accumulateByCategory(currentTransactions, categories, current);
  accumulateByCategory(previousTransactions, categories, previous);

  const rows: CategoryComparison[] = [];
  for (const catId of new Set([...current.keys(), ...previous.keys()])) {
    const cat = categories.find((c) => c.id === catId);
    const cur = current.get(catId) ?? 0;
    const prev = previous.get(catId) ?? 0;
    rows.push({
      categoryId: catId,
      name: cat?.name ?? catId,
      color: cat?.color ?? "#8b5cf6",
      current: cur,
      previous: prev,
      diff: cur - prev,
      pct: prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null,
      isNew: prev === 0 && cur > 0,
    });
  }

  rows.sort((a, b) => b.current - a.current || b.previous - a.previous);

  const totalCurrent = [...current.values()].reduce((a, b) => a + b, 0);
  const totalPrevious = [...previous.values()].reduce((a, b) => a + b, 0);

  return {
    rows,
    total: {
      current: totalCurrent,
      previous: totalPrevious,
      diff: totalCurrent - totalPrevious,
      pct:
        totalPrevious > 0
          ? Math.round(((totalCurrent - totalPrevious) / totalPrevious) * 100)
          : null,
    },
  };
}

/** Insight cepat dari daftar transaksi satu/beberapa siklus. */
export interface QuickInsights {
  /** Total pengeluaran (EXPENSE) dalam rentang. */
  totalSpent: number;
  /** Jumlah transaksi EXPENSE. */
  expenseCount: number;
  /** Rata-rata nominal per transaksi EXPENSE. */
  avgPerExpense: number;
  /** Hari (tanggal) dengan total pengeluaran terbesar, null bila kosong. */
  peakDay: { date: string; total: number } | null;
  /** Pengeluaran tetap — dari transaksi yang dibuat aturan berulang. */
  fixedTotal: number;
  /** Pengeluaran variabel — selain aturan berulang. */
  variableTotal: number;
  /** Persentase pengeluaran tetap dari total (0-100). */
  fixedPct: number;
}

/**
 * Insight murah (D7): hari paling boros, rata-rata per transaksi, dan
 * rasio tetap vs variabel. "Tetap" = transaksi hasil materialisasi
 * aturan berulang (recurringId terisi), "variabel" = sisanya.
 */
export function getQuickInsights(
  transactions: Transaction[],
): QuickInsights {
  let totalSpent = 0;
  let expenseCount = 0;
  let fixedTotal = 0;
  const dayTotals = new Map<string, number>();

  for (const tr of transactions) {
    if (tr.type !== "EXPENSE") continue;
    totalSpent += tr.amount;
    expenseCount += 1;
    if (tr.recurringId) fixedTotal += tr.amount;
    const day = tr.date.split("T")[0];
    if (day) dayTotals.set(day, (dayTotals.get(day) ?? 0) + tr.amount);
  }

  let peakDay: QuickInsights["peakDay"] = null;
  for (const [date, total] of dayTotals) {
    if (!peakDay || total > peakDay.total) peakDay = { date, total };
  }

  const variableTotal = totalSpent - fixedTotal;

  return {
    totalSpent,
    expenseCount,
    avgPerExpense: expenseCount > 0 ? totalSpent / expenseCount : 0,
    peakDay,
    fixedTotal,
    variableTotal,
    fixedPct: totalSpent > 0 ? Math.round((fixedTotal / totalSpent) * 100) : 0,
  };
}

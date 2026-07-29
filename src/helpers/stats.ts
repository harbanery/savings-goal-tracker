import { CATEGORIES, TOTAL_ALLOCATION } from "@/models/categories";
import type { LocaleText, Purchase } from "@/models/types";
import { SAVINGS_INITIAL } from "@/config/variables";

export interface CategoryStat {
  categoryId: string;
  label: LocaleText;
  color: string;
  description: LocaleText;
  allocation: number;
  spent: number;
  remaining: number;
  /** Persentase terpakai (0-100). */
  percent: number;
  purchaseCount: number;
  /** Apakah kategori ini exclude dari alokasi wadah. */
  excludeFromAllocation: boolean;
}

export interface CycleStats {
  /** Saldo awal siklus (dari .env). */
  savingsInitial: number;
  /** Total pengeluaran siklus ini (semua kategori termasuk Belanja). */
  totalSpent: number;
  /** Total pengeluaran hanya dari kategori yang dialokasikan (exclude Belanja). */
  allocatedSpent: number;
  /** Sisa saldo (savingsInitial - totalSpent). */
  remaining: number;
  /** Limit pengeluaran = total alokasi wadah (exclude Belanja). */
  spendingLimit: number;
  /** Sisa dari limit pengeluaran (spendingLimit - totalSpent, bisa minus). */
  limitRemaining: number;
  /** Persentase limit terpakai (0-100, cap 100). */
  limitPercent: number;
  /** Apakah sudah melebihi limit? */
  overLimit: boolean;
  /** Total alokasi wadah (exclude Belanja). */
  totalAllocation: number;
  /** Jumlah pembelian. */
  purchaseCount: number;
  /** Breakdown per kategori. */
  categories: CategoryStat[];
}

/**
 * Hitung statistik siklus dari daftar pembelian.
 * Limit pengeluaran = total alokasi wadah (kategori yang tidak di-exclude).
 */
export function computeCycleStats(purchases: Purchase[]): CycleStats {
  const totalAllocation = TOTAL_ALLOCATION;

  // Inisialisasi stat per kategori
  const catMap = new Map<string, CategoryStat>();
  for (const c of CATEGORIES) {
    catMap.set(c.id, {
      categoryId: c.id,
      label: c.label,
      color: c.color,
      description: c.description,
      allocation: c.allocation,
      spent: 0,
      remaining: c.allocation,
      percent: 0,
      purchaseCount: 0,
      excludeFromAllocation: !!c.excludeFromAllocation,
    });
  }

  // Akumulasi pengeluaran per kategori
  let totalSpent = 0;
  let allocatedSpent = 0;
  for (const p of purchases) {
    const cat = catMap.get(p.categoryId);
    if (cat) {
      cat.spent += p.amount;
      cat.purchaseCount++;
    }
    totalSpent += p.amount;
    // Hanya kategori yang punya alokasi yang masuk ke limit.
    if (cat && !cat.excludeFromAllocation) {
      allocatedSpent += p.amount;
    }
  }

  // Finalisasi stat per kategori
  const categories = CATEGORIES.map((c) => {
    const stat = catMap.get(c.id)!;
    stat.remaining = c.allocation - stat.spent;
    stat.percent =
      c.allocation > 0
        ? Math.round((stat.spent / c.allocation) * 100)
        : 0;
    return stat;
  });

  const remaining = SAVINGS_INITIAL - totalSpent;
  const spendingLimit = totalAllocation;
  // Sisa limit hanya dihitung dari pengeluaran kategori yang dialokasikan.
  const limitRemaining = spendingLimit - allocatedSpent;
  const limitPercent =
    spendingLimit > 0
      ? Math.min(100, Math.round((allocatedSpent / spendingLimit) * 100))
      : 0;
  const overLimit = allocatedSpent > spendingLimit;

  return {
    savingsInitial: SAVINGS_INITIAL,
    totalSpent,
    allocatedSpent,
    remaining,
    spendingLimit,
    limitRemaining,
    limitPercent,
    overLimit,
    totalAllocation,
    purchaseCount: purchases.length,
    categories,
  };
}

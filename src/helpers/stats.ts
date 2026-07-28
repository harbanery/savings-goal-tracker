import { CATEGORIES } from "@/models/categories";
import type { Purchase } from "@/models/types";
import { SAVINGS_INITIAL, SPENDING_LIMIT } from "@/config/variables";

export interface CategoryStat {
  categoryId: string;
  label: string;
  color: string;
  description: string;
  allocation: number;
  spent: number;
  remaining: number;
  /** Persentase terpakai (0-100). */
  percent: number;
  purchaseCount: number;
}

export interface CycleStats {
  /** Saldo awal siklus (dari .env). */
  savingsInitial: number;
  /** Total pengeluaran siklus ini. */
  totalSpent: number;
  /** Sisa saldo (savingsInitial - totalSpent). */
  remaining: number;
  /** Target limit pengeluaran (dari .env). */
  spendingLimit: number;
  /** Sisa dari limit pengeluaran (spendingLimit - totalSpent). */
  limitRemaining: number;
  /** Persentase limit terpakai (0-100). */
  limitPercent: number;
  /** Apakah sudah melebihi limit? */
  overLimit: boolean;
  /** Total alokasi semua wadah. */
  totalAllocation: number;
  /** Surplus bulanan (savingsInitial - totalAllocation). */
  surplus: number;
  /** Jumlah pembelian. */
  purchaseCount: number;
  /** Breakdown per kategori. */
  categories: CategoryStat[];
}

/**
 * Hitung statistik siklus dari daftar pembelian.
 */
export function computeCycleStats(purchases: Purchase[]): CycleStats {
  const totalAllocation = CATEGORIES.reduce(
    (acc, c) => acc + c.allocation,
    0,
  );
  const surplus = SAVINGS_INITIAL - totalAllocation;

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
    });
  }

  // Akumulasi pengeluaran per kategori
  let totalSpent = 0;
  for (const p of purchases) {
    const cat = catMap.get(p.categoryId);
    if (cat) {
      cat.spent += p.amount;
      cat.purchaseCount++;
    }
    totalSpent += p.amount;
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
  const limitRemaining = SPENDING_LIMIT - totalSpent;
  const limitPercent =
    SPENDING_LIMIT > 0
      ? Math.round((totalSpent / SPENDING_LIMIT) * 100)
      : 0;
  const overLimit = totalSpent > SPENDING_LIMIT;

  return {
    savingsInitial: SAVINGS_INITIAL,
    totalSpent,
    remaining,
    spendingLimit: SPENDING_LIMIT,
    limitRemaining,
    limitPercent,
    overLimit,
    totalAllocation,
    surplus,
    purchaseCount: purchases.length,
    categories,
  };
}

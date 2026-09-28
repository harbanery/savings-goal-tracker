import type {
  BudgetCategory,
  Transaction,
} from "@/features/web/types";

/**
 * Statistik siklus — mendukung EXPENSE, INCOME, dan TRANSFER.
 *
 * Model saldo:
 * - EXPENSE  : mengurangi saldo & wadah sumber.
 * - INCOME   : menambah saldo & wadah tujuan.
 * - TRANSFER : memindahkan antar wadah (total saldo tidak berubah).
 *
 * Saldo bersih siklus = savingsInitial + totalIncome - totalSpent.
 */

export interface SubcategoryStat {
  subcategoryId: string;
  name: string;
  spent: number;
  transactionCount: number;
  /** Persentase dari total pengeluaran kategori induk (0-100). */
  share: number;
}

export interface CategoryStat {
  categoryId: string;
  name: string;
  color: string;
  allocation: number;
  /** Total pengeluaran (EXPENSE keluar) dari wadah ini. */
  spent: number;
  /** Total pemasukan (INCOME masuk) ke wadah ini. */
  income: number;
  /** Transfer masuk ke wadah ini. */
  transferIn: number;
  /** Transfer keluar dari wadah ini. */
  transferOut: number;
  /** Sisa alokasi efektif: allocation + income + transferIn - spent - transferOut. */
  remaining: number;
  /** Persentase alokasi terpakai (0-100). */
  percent: number;
  transactionCount: number;
  subcategories: SubcategoryStat[];
}

export interface CycleStats {
  /** Saldo awal siklus (settings user). */
  savingsInitial: number;
  /** Total pemasukan siklus ini. */
  totalIncome: number;
  /** Total pengeluaran (EXPENSE) siklus ini. */
  totalSpent: number;
  /** Saldo bersih = savingsInitial + totalIncome - totalSpent. */
  netSavings: number;
  /** Limit pengeluaran = total alokasi wadah. */
  spendingLimit: number;
  /** Sisa dari limit pengeluaran (bisa minus). */
  limitRemaining: number;
  /** Persentase limit terpakai (0-100, cap 100). */
  limitPercent: number;
  /** Apakah sudah melebihi limit? */
  overLimit: boolean;
  /** Total alokasi wadah. */
  totalAllocation: number;
  /** Jumlah transaksi. */
  transactionCount: number;
  /** Breakdown per kategori. */
  categories: CategoryStat[];
}

/** Hitung statistik siklus dari daftar transaksi + kategori user. */
export function computeCycleStats(
  transactions: Transaction[],
  categories: BudgetCategory[],
  savingsInitial: number,
): CycleStats {
  const totalAllocation = categories.reduce((acc, c) => acc + c.allocation, 0);

  // Inisialisasi stat per kategori + per subkategori.
  const catMap = new Map<string, CategoryStat>();
  const subMap = new Map<string, Map<string, SubcategoryStat>>();
  for (const c of categories) {
    catMap.set(c.id, {
      categoryId: c.id,
      name: c.name,
      color: c.color,
      allocation: c.allocation,
      spent: 0,
      income: 0,
      transferIn: 0,
      transferOut: 0,
      remaining: c.allocation,
      percent: 0,
      transactionCount: 0,
      subcategories: [],
    });
    subMap.set(
      c.id,
      new Map(
        c.subcategories.map((s) => [
          s.id,
          {
            subcategoryId: s.id,
            name: s.name,
            spent: 0,
            transactionCount: 0,
            share: 0,
          },
        ]),
      ),
    );
  }

  let totalSpent = 0;
  let totalIncome = 0;

  for (const tr of transactions) {
    if (tr.type === "EXPENSE") {
      const cat = catMap.get(tr.categoryId);
      if (cat) {
        cat.spent += tr.amount;
        cat.transactionCount++;
        if (tr.subcategoryId) {
          const sub = subMap.get(tr.categoryId)?.get(tr.subcategoryId);
          if (sub) {
            sub.spent += tr.amount;
            sub.transactionCount++;
          }
        }
      }
      totalSpent += tr.amount;
    } else if (tr.type === "INCOME") {
      const cat = catMap.get(tr.categoryId);
      if (cat) {
        cat.income += tr.amount;
        cat.transactionCount++;
      }
      totalIncome += tr.amount;
    } else if (tr.type === "TRANSFER" && tr.toCategoryId) {
      const from = catMap.get(tr.categoryId);
      const to = catMap.get(tr.toCategoryId);
      if (from) {
        from.transferOut += tr.amount;
        from.transactionCount++;
      }
      if (to) {
        to.transferIn += tr.amount;
        to.transactionCount++;
      }
    }
  }

  // Finalisasi stat per kategori + share subkategori.
  const catStats = categories.map((c) => {
    const stat = catMap.get(c.id)!;
    stat.remaining =
      c.allocation + stat.income + stat.transferIn - stat.spent - stat.transferOut;
    stat.percent =
      c.allocation > 0 ? Math.round((stat.spent / c.allocation) * 100) : 0;
    stat.subcategories = [...(subMap.get(c.id)?.values() ?? [])].map((s) => ({
      ...s,
      share: stat.spent > 0 ? Math.round((s.spent / stat.spent) * 100) : 0,
    }));
    return stat;
  });

  const netSavings = savingsInitial + totalIncome - totalSpent;
  const limitRemaining = totalAllocation - totalSpent;
  const limitPercent =
    totalAllocation > 0
      ? Math.min(100, Math.round((totalSpent / totalAllocation) * 100))
      : 0;

  return {
    savingsInitial,
    totalIncome,
    totalSpent,
    netSavings,
    spendingLimit: totalAllocation,
    limitRemaining,
    limitPercent,
    overLimit: totalSpent > totalAllocation,
    totalAllocation,
    transactionCount: transactions.length,
    categories: catStats,
  };
}

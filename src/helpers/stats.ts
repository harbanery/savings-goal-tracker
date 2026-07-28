import type { SavingsGoal } from "@/models/types";

export interface SavingsStats {
  /** Total terkumpul dari semua goal. */
  totalSaved: number;
  /** Total target dari semua goal. */
  totalTarget: number;
  /** Sisa yang belum tercapai (totalTarget - totalSaved). */
  remaining: number;
  /** Persentase pencapaian keseluruhan (0-100). */
  overallProgress: number;
  /** Jumlah goal. */
  goalsCount: number;
  /** Jumlah goal yang sudah tercapai (currentAmount >= targetAmount). */
  completedGoals: number;
  /** Total setoran pada bulan berjalan. */
  thisMonthSaved: number;
}

/**
 * Hitung statistik agregat dari daftar goal.
 */
export function computeSavingsStats(goals: SavingsGoal[]): SavingsStats {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}`;

  let totalSaved = 0;
  let totalTarget = 0;
  let thisMonthSaved = 0;
  let completedGoals = 0;

  for (const goal of goals) {
    totalSaved += goal.currentAmount;
    totalTarget += goal.targetAmount;
    if (goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount) {
      completedGoals++;
    }
    for (const c of goal.contributions) {
      if (c.date.startsWith(monthPrefix)) {
        thisMonthSaved += c.amount;
      }
    }
  }

  const remaining = Math.max(0, totalTarget - totalSaved);
  const overallProgress =
    totalTarget > 0
      ? Math.min(100, Math.round((totalSaved / totalTarget) * 100))
      : 0;

  return {
    totalSaved,
    totalTarget,
    remaining,
    overallProgress,
    goalsCount: goals.length,
    completedGoals,
    thisMonthSaved,
  };
}

import type {
  Contribution as PrismaContribution,
  SavingsGoal as PrismaSavingsGoal,
} from "@prisma/client";
import type { Contribution, SavingsGoal } from "@/models/types";

/**
 * Konversi nilai Decimal Prisma menjadi number (aman untuk RSC serialization).
 */
function toNumber(
  value: { toString(): string } | number | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

function toContribution(c: PrismaContribution): Contribution {
  return {
    id: c.id,
    goalId: c.goalId,
    amount: toNumber(c.amount),
    note: c.note,
    date: c.date.toISOString(),
  };
}

/**
 * Transformasi record Prisma (dengan relasi contributions) ke model UI.
 * Menghitung currentAmount (jumlah setoran) dan progress (0-100).
 */
export function toSavingsGoal(
  record: PrismaSavingsGoal & { contributions: PrismaContribution[] },
): SavingsGoal {
  const contributions = record.contributions
    .map(toContribution)
    .sort((a, b) => b.date.localeCompare(a.date)); // terbaru di depan

  const currentAmount = contributions.reduce((sum, c) => sum + c.amount, 0);
  const targetAmount = toNumber(record.targetAmount);
  const progress =
    targetAmount > 0
      ? Math.min(100, Math.round((currentAmount / targetAmount) * 100))
      : 0;

  return {
    id: record.id,
    name: record.name,
    targetAmount,
    currentAmount,
    color: record.color,
    deadline: record.deadline ? record.deadline.toISOString() : null,
    progress,
    contributions,
    createdAt: record.createdAt.toISOString(),
  };
}

/** Transformasi list record Prisma ke list model UI. */
export function toSavingsGoals(
  records: (PrismaSavingsGoal & { contributions: PrismaContribution[] })[],
): SavingsGoal[] {
  return records.map(toSavingsGoal);
}

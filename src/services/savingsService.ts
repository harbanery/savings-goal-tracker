import { prisma } from "@/server/db";
import { withRetry } from "@/server/prismaRetry";
import type { SavingsGoal, Contribution } from "@prisma/client";

/**
 * Service layer untuk akses data Savings Goal Tracker.
 * Berinteraksi langsung dengan Prisma. Dipanggil oleh server actions.
 * Setiap operasi dibungkus `withRetry` agar transient connection error
 * otomatis di-retry + reconnect.
 */

export type GoalWithContributions = SavingsGoal & {
  contributions: Contribution[];
};

/** Ambil semua goal beserta setoran-nya (urut termuda pembuatan terakhir). */
export async function getAllGoals(): Promise<GoalWithContributions[]> {
  return withRetry(() =>
    prisma.savingsGoal.findMany({
      include: { contributions: { orderBy: { date: "asc" } } },
      orderBy: { createdAt: "asc" },
    }),
  );
}

export interface CreateGoalData {
  name: string;
  targetAmount: number;
  deadline: Date | null;
  color: string;
}

/** Buat goal baru. */
export async function createGoal(
  data: CreateGoalData,
): Promise<SavingsGoal> {
  return withRetry(() =>
    prisma.savingsGoal.create({
      data: {
        name: data.name,
        targetAmount: data.targetAmount,
        deadline: data.deadline,
        color: data.color,
      },
    }),
  );
}

export interface UpdateGoalData {
  name?: string;
  targetAmount?: number;
  deadline?: Date | null;
  color?: string;
}

/** Perbarui goal berdasarkan id. */
export async function updateGoal(
  id: string,
  data: UpdateGoalData,
): Promise<SavingsGoal> {
  return withRetry(() =>
    prisma.savingsGoal.update({
      where: { id },
      data,
    }),
  );
}

/** Hapus goal berdasarkan id (contributions ikut terhapus via cascade). */
export async function deleteGoal(id: string): Promise<SavingsGoal> {
  return withRetry(() =>
    prisma.savingsGoal.delete({
      where: { id },
    }),
  );
}

export interface AddContributionData {
  goalId: string;
  amount: number;
  note: string;
  date?: Date;
}

/** Tambah setoran untuk sebuah goal. */
export async function addContribution(
  data: AddContributionData,
): Promise<Contribution> {
  return withRetry(() =>
    prisma.contribution.create({
      data: {
        goalId: data.goalId,
        amount: data.amount,
        note: data.note,
        date: data.date ?? new Date(),
      },
    }),
  );
}

/** Hapus satu setoran berdasarkan id. */
export async function deleteContribution(
  id: string,
): Promise<Contribution> {
  return withRetry(() =>
    prisma.contribution.delete({
      where: { id },
    }),
  );
}

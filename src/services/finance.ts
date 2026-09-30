import { Prisma } from "@prisma/client";
import { prisma, withRetry } from "@/lib/prisma";
import type { BudgetOverview, SavingsTarget } from "@/features/web/types";
import type { CycleInfo } from "@/features/web/utils/cycle";
import { getCycleForDate } from "@/features/web/utils/cycle";
import {
  SAVINGS_PROTECTION_CODE,
  WALLET_LIMIT_CODE,
} from "@/features/web/utils/finance";

/**
 * Data-access layer menu Keuangan: ringkasan Budget per siklus (proteksi
 * tabungan) dan CRUD Target tabungan.
 */

type TargetRecord = Prisma.SavingsTargetGetPayload<object>;

/** Ubah record DB menjadi SavingsTarget UI. */
export function toTarget(t: TargetRecord): SavingsTarget {
  return {
    id: t.id,
    name: t.name,
    targetAmount: Number(t.targetAmount),
    savedAmount: Number(t.savedAmount),
    deadline: t.deadline ? t.deadline.toISOString() : null,
    note: t.note,
  };
}

export async function getTargets(userId: string): Promise<SavingsTarget[]> {
  const rows = await withRetry(() =>
    prisma.savingsTarget.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
  );
  return rows.map(toTarget);
}

export interface TargetInput {
  name: string;
  targetAmount: number;
  deadline?: Date | null;
  note?: string;
}

function validateTargetInput(data: TargetInput): void {
  if (!data.name.trim()) throw new Error("Nama target wajib diisi.");
  if (!Number.isFinite(data.targetAmount) || data.targetAmount <= 0) {
    throw new Error("Nilai target harus lebih dari 0.");
  }
  if (data.targetAmount > 1e12) {
    throw new Error("Nilai target terlalu besar (maks 1 triliun).");
  }
}

export async function createTarget(
  userId: string,
  data: TargetInput,
): Promise<SavingsTarget> {
  validateTargetInput(data);
  const row = await withRetry(() =>
    prisma.savingsTarget.create({
      data: {
        userId,
        name: data.name.trim().slice(0, 100),
        targetAmount: new Prisma.Decimal(Math.round(data.targetAmount)),
        deadline: data.deadline ?? null,
        note: (data.note ?? "").trim().slice(0, 500),
      },
    }),
  );
  return toTarget(row);
}

export async function updateTarget(
  userId: string,
  id: string,
  data: TargetInput,
): Promise<void> {
  const existing = await prisma.savingsTarget.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new Error("Target tidak ditemukan.");
  validateTargetInput(data);
  await withRetry(() =>
    prisma.savingsTarget.update({
      where: { id },
      data: {
        name: data.name.trim().slice(0, 100),
        targetAmount: new Prisma.Decimal(Math.round(data.targetAmount)),
        deadline: data.deadline ?? null,
        note: (data.note ?? "").trim().slice(0, 500),
      },
    }),
  );
}

/** Tambah dana terkumpul pada target (mis. setoran tabungan manual). */
export async function addTargetFunds(
  userId: string,
  id: string,
  amount: number,
): Promise<SavingsTarget> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Nominal dana harus lebih dari 0.");
  }
  const existing = await prisma.savingsTarget.findFirst({
    where: { id, userId },
    select: { id: true, savedAmount: true },
  });
  if (!existing) throw new Error("Target tidak ditemukan.");
  const row = await withRetry(() =>
    prisma.savingsTarget.update({
      where: { id },
      data: {
        savedAmount:
          new Prisma.Decimal(existing.savedAmount).plus(Math.round(amount)),
      },
    }),
  );
  return toTarget(row);
}

export async function deleteTarget(userId: string, id: string): Promise<void> {
  const existing = await prisma.savingsTarget.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new Error("Target tidak ditemukan.");
  await withRetry(() => prisma.savingsTarget.delete({ where: { id } }));
}

/**
 * Ringkasan Budget satu siklus:
 * bisa dialokasikan = saldo awal + pemasukan - tabungan dilindungi.
 */
export async function getBudgetOverview(
  userId: string,
  cycle: CycleInfo,
): Promise<BudgetOverview> {
  const [settings, agg] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId } }),
    withRetry(() =>
      prisma.transaction.groupBy({
        by: ["type"],
        where: {
          userId,
          date: { gte: cycle.startDate, lte: cycle.endDate },
        },
        _sum: { amount: true },
      }),
    ),
  ]);

  const protectedSavings = Number(settings?.protectedSavings ?? 0);
  const savingsInitial = Number(settings?.savingsInitial ?? 0);
  const totalIncome = Number(
    agg.find((g) => g.type === "INCOME")?._sum.amount ?? 0,
  );
  const totalSpent = Number(
    agg.find((g) => g.type === "EXPENSE")?._sum.amount ?? 0,
  );
  const allocatable = savingsInitial + totalIncome - protectedSavings;
  const remaining = allocatable - totalSpent;

  return {
    protectedSavings,
    savingsInitial,
    totalIncome,
    totalSpent,
    allocatable,
    remaining,
    overProtected: totalSpent > allocatable,
  };
}

/**
 * Proteksi tabungan (menu Budget): lempar error berkode SAVINGS_PROTECTION
 * bila proyeksi pengeluaran siklus melebihi batas alokasi. Client menangkap
 * error ini dan menawarkan konfirmasi "terpaksa" (force).
 *
 * @param additionalExpense tambahan pengeluaran terhadap total siklus saat ini
 *                          (sudah dikurangi nilai lama untuk kasus edit).
 */
export async function assertSavingsProtection(
  userId: string,
  date: Date,
  additionalExpense: number,
  force: boolean,
): Promise<void> {
  if (force || additionalExpense <= 0) return;
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });
  const protectedSavings = Number(settings?.protectedSavings ?? 0);
  if (protectedSavings <= 0) return;

  const cycle = getCycleForDate(date, settings?.cycleStartDay ?? 25);
  const overview = await getBudgetOverview(userId, cycle);
  const projected = overview.totalSpent + additionalExpense;
  if (projected > overview.allocatable) {
    throw new Error(
      `${SAVINGS_PROTECTION_CODE}|${Math.round(overview.allocatable)}|${Math.round(projected)}`,
    );
  }
}

/**
 * Batas wadah (insight DROID.md): alokasi wadah = batas PENGELUARAN per
 * siklus — hanya EXPENSE yang dihitung; pemasukan (INCOME) dan transfer
 * (TRANSFER) tidak dibatasi. Wadah tanpa alokasi (0) tidak dibatasi.
 * Lempar error berkode WALLET_LIMIT bila proyeksi pengeluaran wadah
 * melebihi batas — berbeda dari proteksi tabungan, batas wadah TIDAK bisa
 * dilewati (tanpa opsi paksa).
 *
 * @param additionalExpense tambahan pengeluaran (EXPENSE) wadah terkait
 *                         (sudah dikurangi nilai lama untuk kasus edit).
 */
export async function assertWalletLimit(
  userId: string,
  categoryId: string,
  date: Date,
  additionalExpense: number,
): Promise<void> {
  if (additionalExpense <= 0) return;
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { name: true, allocation: true },
  });
  if (!category) throw new Error("Wadah tidak ditemukan.");
  // Wadah tanpa alokasi (0) tidak dibatasi — Cash pun ikut dibatasi
  // bila batasnya diatur.
  const limit = Number(category.allocation);
  if (limit <= 0) return;

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { cycleStartDay: true },
  });
  const cycle = getCycleForDate(date, settings?.cycleStartDay ?? 25);

  // Batas hanya untuk pengeluaran (EXPENSE) — pemasukan (INCOME) dan
  // transfer (TRANSFER) tidak dihitung.
  const agg = await withRetry(() =>
    prisma.transaction.aggregate({
      where: {
        userId,
        categoryId,
        type: "EXPENSE",
        date: { gte: cycle.startDate, lte: cycle.endDate },
      },
      _sum: { amount: true },
    }),
  );
  const current = Number(agg._sum.amount ?? 0);
  const projected = current + additionalExpense;
  if (projected > limit) {
    throw new Error(
      `${WALLET_LIMIT_CODE}|${category.name}|${Math.round(limit)}|${Math.round(projected)}`,
    );
  }
}

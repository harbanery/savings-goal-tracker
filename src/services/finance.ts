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
 * tabungan), CRUD Target tabungan, dan batas alokasi wadah.
 */

/**
 * Tabungan bersih seluruh siklus (semua waktu) dari kumpulan wadah.
 * Kosong = semua wadah (transfer antar wadah saling menghapus).
 * Rumus: pemasukan + transfer masuk − pengeluaran − transfer keluar.
 */
async function computeSaved(
  userId: string,
  categoryIds: string[],
): Promise<number> {
  const scoped = categoryIds.length > 0;
  const field = (col: "categoryId" | "toCategoryId") =>
    scoped ? { [col]: { in: categoryIds } } : {};
  const [incomeAgg, expenseAgg, transferInAgg, transferOutAgg] =
    await Promise.all([
      withRetry(() =>
        prisma.transaction.aggregate({
          where: { userId, type: "INCOME", ...field("categoryId") },
          _sum: { amount: true },
        }),
      ),
      withRetry(() =>
        prisma.transaction.aggregate({
          where: { userId, type: "EXPENSE", ...field("categoryId") },
          _sum: { amount: true },
        }),
      ),
      withRetry(() =>
        prisma.transaction.aggregate({
          where: { userId, type: "TRANSFER", ...field("toCategoryId") },
          _sum: { amount: true },
        }),
      ),
      withRetry(() =>
        prisma.transaction.aggregate({
          where: { userId, type: "TRANSFER", ...field("categoryId") },
          _sum: { amount: true },
        }),
      ),
    ]);
  return (
    Number(incomeAgg._sum.amount ?? 0) +
    Number(transferInAgg._sum.amount ?? 0) -
    Number(expenseAgg._sum.amount ?? 0) -
    Number(transferOutAgg._sum.amount ?? 0)
  );
}

/** Pastikan semua wadah milik user; kembalikan id unik. */
async function assertCategoriesOwned(
  userId: string,
  categoryIds: string[],
): Promise<string[]> {
  const unique = [...new Set(categoryIds)];
  if (unique.length > 0) {
    const owned = await prisma.category.findMany({
      where: { userId, id: { in: unique } },
      select: { id: true },
    });
    if (owned.length !== unique.length) {
      throw new Error("Wadah tidak ditemukan.");
    }
  }
  return unique;
}

/** Target + dana terkumpul otomatis (tabungan bersih seluruh siklus). */
export async function getTargets(
  userId: string,
): Promise<SavingsTarget[]> {
  const rows = await withRetry(() =>
    prisma.savingsTarget.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
  );
  return Promise.all(
    rows.map(async (t) => ({
      id: t.id,
      name: t.name,
      targetAmount: Number(t.targetAmount),
      saved: await computeSaved(userId, t.categoryIds),
      categoryIds: t.categoryIds,
      deadline: t.deadline ? t.deadline.toISOString() : null,
      note: t.note,
    })),
  );
}

export interface TargetInput {
  name: string;
  targetAmount: number;
  /** Wadah sumber dana: kosong = semua wadah. */
  categoryIds?: string[];
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
  const categoryIds = await assertCategoriesOwned(userId, data.categoryIds ?? []);
  const row = await withRetry(() =>
    prisma.savingsTarget.create({
      data: {
        userId,
        name: data.name.trim().slice(0, 100),
        targetAmount: new Prisma.Decimal(Math.round(data.targetAmount)),
        categoryIds,
        deadline: data.deadline ?? null,
        note: (data.note ?? "").trim().slice(0, 500),
      },
    }),
  );
  return {
    id: row.id,
    name: row.name,
    targetAmount: Number(row.targetAmount),
    saved: await computeSaved(userId, row.categoryIds),
    categoryIds: row.categoryIds,
    deadline: row.deadline ? row.deadline.toISOString() : null,
    note: row.note,
  };
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
  const categoryIds = await assertCategoriesOwned(userId, data.categoryIds ?? []);
  await withRetry(() =>
    prisma.savingsTarget.update({
      where: { id },
      data: {
        name: data.name.trim().slice(0, 100),
        targetAmount: new Prisma.Decimal(Math.round(data.targetAmount)),
        categoryIds,
        deadline: data.deadline ?? null,
        note: (data.note ?? "").trim().slice(0, 500),
      },
    }),
  );
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
 * Proteksi tabungan (menu Budget): batas pengeluaran SELALU mengikuti
 * budget yang bisa dialokasikan (saldo awal + pemasukan − tabungan
 * dilindungi) — lempar error berkode SAVINGS_PROTECTION bila proyeksi
 * pengeluaran siklus melebihi batas tersebut (insight DROID.md: batas
 * tetap mengikuti budget yang bisa dialokasikan). Client menangkap
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
 * Batas alokasi wadah (insight DROID.md): dana wadah per siklus = pemasukan
 * (INCOME) + transfer masuk − pengeluaran (EXPENSE) − transfer keluar.
 * ALOKASI TIDAK BISA DIEDIT di tiap wadah — dana harus masuk lewat
 * pemasukan atau transfer (contoh: bank dapat gaji 10 juta → transfer
 * 300 ribu ke Gopay → baru Gopay bisa pengeluaran/transfer kembali).
 * Wadah yang belum menerima pemasukan/transfer masuk tidak bisa
 * mengeluarkan dana sama sekali — inilah batas yang menjamin pengeluaran
 * tidak melebihi dana yang tersedia. Lempar error berkode WALLET_LIMIT
 * bila proyeksi keluaran melebihi dana tersedia — berbeda dari proteksi
 * tabungan, batas wadah TIDAK bisa dilewati (tanpa paksa).
 *
 * @param additionalOutflow tambahan dana keluar (EXPENSE/TRANSFER) dari
 *                          wadah terkait (sudah dikurangi nilai lama untuk
 *                          kasus edit).
 */
export async function assertWalletLimit(
  userId: string,
  categoryId: string,
  date: Date,
  additionalOutflow: number,
): Promise<void> {
  if (additionalOutflow <= 0) return;
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { name: true },
  });
  if (!category) throw new Error("Wadah tidak ditemukan.");

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { cycleStartDay: true },
  });
  const cycle = getCycleForDate(date, settings?.cycleStartDay ?? 25);

  // Dana masuk wadah: pemasukan langsung + transfer dari wadah lain.
  const inflowAgg = await withRetry(() =>
    prisma.transaction.aggregate({
      where: {
        userId,
        date: { gte: cycle.startDate, lte: cycle.endDate },
        OR: [
          { type: "INCOME", categoryId },
          { type: "TRANSFER", toCategoryId: categoryId },
        ],
      },
      _sum: { amount: true },
    }),
  );
  // Dana keluar wadah: pengeluaran + transfer ke wadah lain.
  const outflowAgg = await withRetry(() =>
    prisma.transaction.aggregate({
      where: {
        userId,
        date: { gte: cycle.startDate, lte: cycle.endDate },
        OR: [
          { type: "EXPENSE", categoryId },
          { type: "TRANSFER", categoryId },
        ],
      },
      _sum: { amount: true },
    }),
  );

  const inflow = Number(inflowAgg._sum.amount ?? 0);
  const outflow = Number(outflowAgg._sum.amount ?? 0);
  const available = inflow - outflow;
  const projected = outflow + additionalOutflow;
  if (projected > available) {
    throw new Error(
      `${WALLET_LIMIT_CODE}|${category.name}|${Math.round(available)}|${Math.round(projected)}`,
    );
  }
}

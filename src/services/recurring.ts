import { Prisma } from "@prisma/client";
import { prisma, withRetry } from "@/lib/prisma";
import type { RecurringRule, TransactionType } from "@/features/web/types";
import type { CycleInfo } from "@/features/web/utils/cycle";
import { getCycleForDate } from "@/features/web/utils/cycle";
import { clampDayOfMonth } from "@/features/web/utils/finance";

/**
 * Data-access layer transaksi berulang: aturan bulanan yang otomatis
 * dimaterialisasi menjadi Transaction pada tanggal tertentu tiap bulan.
 *
 * Idempotensi: pasangan (recurringId, recurringDate) unik — materialisasi
 * ulang bulanan tidak menghasilkan duplikat.
 */

type RecurringRecord = Prisma.RecurringTransactionGetPayload<object>;

/** Ubah record DB menjadi RecurringRule UI. */
export function toRecurringRule(r: RecurringRecord): RecurringRule {
  return {
    id: r.id,
    type: r.type as TransactionType,
    name: r.name,
    amount: Number(r.amount),
    dayOfMonth: r.dayOfMonth,
    categoryId: r.categoryId,
    subcategoryId: r.subcategoryId,
    note: r.note,
    active: r.active,
  };
}

export async function getRecurringRules(
  userId: string,
): Promise<RecurringRule[]> {
  const rows = await withRetry(() =>
    prisma.recurringTransaction.findMany({
      where: { userId },
      orderBy: [{ active: "desc" }, { dayOfMonth: "asc" }],
    }),
  );
  return rows.map(toRecurringRule);
}

/** Pastikan wadah (dan subkategori opsional) milik user. */
async function assertUnitsOwned(
  userId: string,
  categoryId: string,
  subcategoryId?: string | null,
): Promise<void> {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  if (!category) throw new Error("Wadah tidak ditemukan.");
  if (subcategoryId) {
    const sub = await prisma.subcategory.findFirst({
      where: { id: subcategoryId, categoryId },
      select: { id: true },
    });
    if (!sub) throw new Error("Subkategori tidak ditemukan.");
  }
}

export interface CreateRecurringData {
  type: TransactionType;
  name: string;
  amount: number;
  /** Tanggal jalur bulanan (1-31; di-clamp ke akhir bulan pendek). */
  dayOfMonth: number;
  categoryId: string;
  subcategoryId?: string | null;
  note: string;
}

export async function createRecurringRule(
  userId: string,
  data: CreateRecurringData,
): Promise<RecurringRule> {
  if (data.type !== "EXPENSE" && data.type !== "INCOME") {
    throw new Error("Transaksi berulang hanya untuk pengeluaran/pemasukan.");
  }
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error("Nominal transaksi berulang tidak valid.");
  }
  if (
    !Number.isInteger(data.dayOfMonth) ||
    data.dayOfMonth < 1 ||
    data.dayOfMonth > 31
  ) {
    throw new Error("Tanggal berulang harus 1-31.");
  }
  await assertUnitsOwned(userId, data.categoryId, data.subcategoryId);
  const row = await withRetry(() =>
    prisma.recurringTransaction.create({
      data: {
        userId,
        type: data.type,
        name: data.name,
        amount: new Prisma.Decimal(Math.round(data.amount)),
        dayOfMonth: data.dayOfMonth,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId ?? null,
        note: data.note,
      },
    }),
  );
  return toRecurringRule(row);
}

/** Aktifkan/nonaktifkan aturan (nonaktif tidak dimaterialisasi lagi). */
export async function setRecurringActive(
  userId: string,
  id: string,
  active: boolean,
): Promise<void> {
  const existing = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new Error("Aturan berulang tidak ditemukan.");
  await withRetry(() =>
    prisma.recurringTransaction.update({
      where: { id },
      data: { active },
    }),
  );
}

/** Hapus aturan; transaksi yang sudah tercatat tetap ada (FK SetNull). */
export async function deleteRecurringRule(
  userId: string,
  id: string,
): Promise<void> {
  const existing = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new Error("Aturan berulang tidak ditemukan.");
  await withRetry(() =>
    prisma.recurringTransaction.delete({ where: { id } }),
  );
}

/**
 * Tanggal kemunculan sebuah aturan dalam window siklus (lokal tengah malam).
 * Siklus melintasi 2 bulan kalender (atau 1 bila startDay = 1); kandidat
 * di tiap bulan di-clamp ke jumlah hari bulan itu.
 */
export function occurrenceDatesInCycle(
  dayOfMonth: number,
  cycle: CycleInfo,
): Date[] {
  const { startDate: start, endDate: end } = cycle;
  const out: Date[] = [];

  const d1 = new Date(
    start.getFullYear(),
    start.getMonth(),
    clampDayOfMonth(dayOfMonth, start.getFullYear(), start.getMonth()),
  );
  if (d1 >= start && d1 <= end) out.push(d1);

  const d2 = new Date(
    end.getFullYear(),
    end.getMonth(),
    clampDayOfMonth(dayOfMonth, end.getFullYear(), end.getMonth()),
  );
  const sameAsD1 =
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
  if (!sameAsD1 && d2 >= start && d2 <= end) out.push(d2);

  return out;
}

/**
 * Materialisasi aturan berulang menjadi transaksi untuk satu siklus.
 * Idempoten (upsert recurringId+recurringDate), tanpa backfill sebelum
 * aturan dibuat, dan tanpa membuat kemunculan masa depan.
 */
export async function materializeRecurringForCycle(
  userId: string,
  cycle: CycleInfo,
): Promise<void> {
  const rules = await withRetry(() =>
    prisma.recurringTransaction.findMany({
      where: { userId, active: true },
    }),
  );
  if (rules.length === 0) return;

  const now = new Date();
  for (const rule of rules) {
    const ruleCreated = new Date(rule.createdAt);
    ruleCreated.setHours(0, 0, 0, 0);

    for (const date of occurrenceDatesInCycle(rule.dayOfMonth, cycle)) {
      if (date > now) continue;
      if (date < ruleCreated) continue;
      await withRetry(() =>
        prisma.transaction.upsert({
          where: {
            recurringId_recurringDate: {
              recurringId: rule.id,
              recurringDate: date,
            },
          },
          update: {},
          create: {
            userId,
            type: rule.type,
            name: rule.name,
            amount: rule.amount,
            note: rule.note,
            date,
            categoryId: rule.categoryId,
            subcategoryId: rule.subcategoryId,
            recurringId: rule.id,
            recurringDate: date,
          },
        }),
      );
    }
  }
}

/**
 * Buat aturan berulang + transaksi pertamanya (tanggal pilihan user).
 * Transaksi pertama menautkan recurringDate pada kemunculan siklus itu
 * agar bulan yang sama tidak dimaterialisasi ganda.
 */
export async function createRecurringWithFirstTransaction(
  userId: string,
  data: CreateRecurringData & { date: Date },
): Promise<void> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { cycleStartDay: true },
  });
  const startDay = settings?.cycleStartDay ?? 25;

  const rule = await createRecurringRule(userId, data);

  const cycle = getCycleForDate(data.date, startDay);
  const candidates = occurrenceDatesInCycle(data.dayOfMonth, cycle);
  const occurrence =
    candidates.find(
      (c) =>
        c.getFullYear() === data.date.getFullYear() &&
        c.getMonth() === data.date.getMonth(),
    ) ?? candidates[0] ?? data.date;

  await withRetry(() =>
    prisma.transaction.create({
      data: {
        userId,
        type: rule.type,
        name: rule.name,
        amount: new Prisma.Decimal(Math.round(rule.amount)),
        note: rule.note,
        date: data.date,
        categoryId: rule.categoryId,
        subcategoryId: rule.subcategoryId,
        recurringId: rule.id,
        recurringDate: occurrence,
      },
    }),
  );
}

import { Prisma } from "@prisma/client";
import { prisma, withRetry } from "@/lib/prisma";
import type { CycleInfo } from "@/features/web/utils/cycle";
import {
  getCycleForDate,
  localDayStart,
  toDayUTC,
} from "@/features/web/utils/cycle";

/**
 * Tabungan yang dilindungi PER SIKLUS (menu Budget).
 *
 * Sebelumnya `user_settings.protected_savings` adalah satu nilai global
 * untuk semua siklus. Kini tiap siklus punya nilainya sendiri:
 *
 * - Siklus baru otomatis bernilai 0 (tidak ada baris → 0).
 * - Nilai DIKUNCI pada hari terakhir siklus ("uang disimpan saat hari
 *   terakhir siklus") — setelah terkunci, nilainya tidak bisa diubah lagi
 *   dan tersimpan sebagai riwayat siklus tersebut.
 * - Bila masih ada sisa saldo seluruh dompet di akhir siklus, user bisa
 *   memindahkannya ke tabungan dilindungi. Setelah dipindahkan, seluruh
 *   dompet pada siklus itu terkunci: hanya boleh menerima PEMASUKAN.
 */

/** Kode error dompet terkunci (sisa sudah dipindahkan ke tabungan dilindungi). */
export const WALLET_LOCKED_CODE = "WALLET_LOCKED";

/** Nilai tabungan dilindungi + status kunci satu siklus. */
export interface CycleBudgetInfo {
  cycleKey: string;
  /** Nilai dasar tabungan dilindungi yang diisi user untuk siklus ini. */
  protectedSavings: number;
  /** Tambahan dari sisa saldo dompet yang dipindahkan ke tabungan dilindungi. */
  leftoverAdded: number;
  /** Total tabungan dilindungi siklus ini (dasar + sisa yang dipindahkan). */
  total: number;
  /** true bila nilai siklus ini sudah dikunci (hari terakhir terlampaui). */
  settled: boolean;
  /** true bila sisa dompet sudah dipindahkan (dompet hanya boleh pemasukan). */
  locked: boolean;
}

/** Apakah hari terakhir siklus sudah tercapai (hari kanonik UTC)? */
export function isCycleSettlementDue(
  cycle: CycleInfo,
  now: Date = new Date(),
): boolean {
  return toDayUTC(localDayStart(now)).getTime() >= toDayUTC(cycle.endDate).getTime();
}

function toInfo(
  cycleKey: string,
  row: {
    protectedSavings: Prisma.Decimal;
    leftoverAdded: Prisma.Decimal;
    settledAt: Date | null;
    lockedAt: Date | null;
  } | null,
): CycleBudgetInfo {
  const protectedSavings = Number(row?.protectedSavings ?? 0);
  const leftoverAdded = Number(row?.leftoverAdded ?? 0);
  return {
    cycleKey,
    protectedSavings,
    leftoverAdded,
    total: protectedSavings + leftoverAdded,
    settled: row?.settledAt != null,
    locked: row?.lockedAt != null,
  };
}

/** Baca tabungan dilindungi satu siklus (siklus tanpa baris → 0). */
export async function getCycleBudget(
  userId: string,
  cycleKey: string,
): Promise<CycleBudgetInfo> {
  const row = await withRetry(() =>
    prisma.cycleBudget.findUnique({
      where: { userId_cycleKey: { userId, cycleKey } },
    }),
  );
  return toInfo(cycleKey, row);
}

/**
 * Kunci nilai tabungan dilindungi siklus ini bila hari terakhir siklus
 * sudah tercapai (idempoten). Dipanggil pada jalur BACA (bukan cron):
 * tabungan dilindungi "disimpan" saat hari terakhir siklus, sehingga
 * modul yang membacanya (Budget, Keuangan, Dashboard) selalu melihat
 * nilai yang sudah final untuk siklus yang sudah berjalan.
 */
export async function settleCycleBudgetIfDue(
  userId: string,
  cycle: CycleInfo,
  now: Date = new Date(),
): Promise<CycleBudgetInfo> {
  const existing = await getCycleBudget(userId, cycle.key);
  if (existing.settled || !isCycleSettlementDue(cycle, now)) return existing;

  const row = await withRetry(() =>
    prisma.cycleBudget.upsert({
      where: { userId_cycleKey: { userId, cycleKey: cycle.key } },
      // Nilai yang sudah ada dipertahankan; hanya menandai waktu kunci.
      update: { settledAt: now },
      create: {
        userId,
        cycleKey: cycle.key,
        protectedSavings: new Prisma.Decimal(0),
        settledAt: now,
      },
    }),
  );
  return toInfo(cycle.key, row);
}

/**
 * Tetapkan nilai tabungan dilindungi siklus ini.
 * Ditolak bila siklus sudah dikunci (hari terakhir siklus terlampaui).
 */
export async function setCycleProtectedSavings(
  userId: string,
  cycle: CycleInfo,
  amount: number,
): Promise<CycleBudgetInfo> {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Tabungan dilindungi tidak valid.");
  }
  const current = await settleCycleBudgetIfDue(userId, cycle);
  if (current.settled) {
    throw new Error(
      "Tabungan dilindungi siklus ini sudah dikunci (hari terakhir siklus).",
    );
  }
  const row = await withRetry(() =>
    prisma.cycleBudget.upsert({
      where: { userId_cycleKey: { userId, cycleKey: cycle.key } },
      update: { protectedSavings: new Prisma.Decimal(Math.round(amount)) },
      create: {
        userId,
        cycleKey: cycle.key,
        protectedSavings: new Prisma.Decimal(Math.round(amount)),
      },
    }),
  );
  return toInfo(cycle.key, row);
}

/**
 * Sisa saldo seluruh dompet pada satu siklus: pemasukan + transfer masuk
 * − pengeluaran − transfer keluar (transfer antar dompet saling menghapus
 * bila dijumlahkan seluruh dompet). Nilai negatif dianggap 0.
 */
export async function computeCycleLeftover(
  userId: string,
  cycle: CycleInfo,
): Promise<number> {
  const rows = await withRetry(() =>
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId,
        date: { gte: cycle.startDate, lte: cycle.endDate },
      },
      _sum: { amount: true },
    }),
  );
  const sumOf = (type: string) =>
    Number(rows.find((r) => r.type === type)?._sum.amount ?? 0);
  // Transfer tidak mengubah total saldo (keluar dari satu dompet, masuk
  // ke dompet lain) — hanya pemasukan & pengeluaran yang mengubah total.
  return Math.max(0, sumOf("INCOME") - sumOf("EXPENSE"));
}

/**
 * Pindahkan sisa saldo seluruh dompet ke tabungan dilindungi siklus ini,
 * lalu kunci dompet siklus tersebut (hanya boleh menerima pemasukan).
 * Idempoten: pemanggilan ulang setelah terkunci hanya mengembalikan nilai.
 */
export async function applyCycleLeftoverToProtected(
  userId: string,
  cycle: CycleInfo,
  now: Date = new Date(),
): Promise<CycleBudgetInfo> {
  const current = await settleCycleBudgetIfDue(userId, cycle, now);
  if (current.locked) return current;
  if (!current.settled) {
    throw new Error(
      "Sisa dompet hanya bisa dipindahkan pada hari terakhir siklus.",
    );
  }

  const leftover = await computeCycleLeftover(userId, cycle);
  if (leftover <= 0) {
    throw new Error("Tidak ada sisa saldo dompet untuk dipindahkan.");
  }

  const row = await withRetry(() =>
    prisma.cycleBudget.update({
      where: { userId_cycleKey: { userId, cycleKey: cycle.key } },
      data: {
        leftoverAdded: { increment: new Prisma.Decimal(leftover) },
        lockedAt: now,
      },
    }),
  );
  return toInfo(cycle.key, row);
}

/** true bila siklus ini terkunci (sisa dompet sudah dipindahkan). */
export async function isCycleLocked(
  userId: string,
  cycleKey: string,
): Promise<boolean> {
  const row = await withRetry(() =>
    prisma.cycleBudget.findUnique({
      where: { userId_cycleKey: { userId, cycleKey } },
      select: { lockedAt: true },
    }),
  );
  return row?.lockedAt != null;
}

/**
 * Pastikan siklus transaksi BELUM terkunci. Setelah sisa dompet dipindahkan
 * ke tabungan dilindungi, seluruh dompet hanya boleh menerima PEMASUKAN —
 * pengeluaran & transfer ditolak (berkode WALLET_LOCKED).
 */
export async function assertCycleNotLocked(
  userId: string,
  date: Date,
  startDay: number,
  type: string,
): Promise<void> {
  if (type === "INCOME") return;
  const cycle = getCycleForDate(date, startDay);
  const row = await withRetry(() =>
    prisma.cycleBudget.findUnique({
      where: { userId_cycleKey: { userId, cycleKey: cycle.key } },
      select: { lockedAt: true },
    }),
  );
  if (row?.lockedAt) {
    throw new Error(
      `${WALLET_LOCKED_CODE}|Sisa saldo dompet siklus ini sudah dipindahkan ke tabungan dilindungi — hanya pemasukan yang bisa dicatat.`,
    );
  }
}

/** Tabungan dilindungi beberapa siklus (map kunci siklus → total). */
export async function getCycleBudgetMap(
  userId: string,
  cycles: CycleInfo[],
): Promise<Record<string, number>> {
  if (cycles.length === 0) return {};
  const keys = cycles.map((c) => c.key);
  const rows = await withRetry(() =>
    prisma.cycleBudget.findMany({
      where: { userId, cycleKey: { in: keys } },
    }),
  );
  const byKey = new Map(rows.map((r) => [r.cycleKey, r]));
  const out: Record<string, number> = {};
  for (const cycle of cycles) {
    const row = byKey.get(cycle.key);
    out[cycle.key] = row
      ? Number(row.protectedSavings) + Number(row.leftoverAdded)
      : 0;
  }
  return out;
}

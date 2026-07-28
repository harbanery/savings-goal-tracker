import { prisma } from "@/server/db";
import { withRetry } from "@/server/prismaRetry";
import { Prisma, type Purchase } from "@prisma/client";

/**
 * Service layer untuk akses data Monthly Budget Tracker.
 * Setiap operasi dibungkus `withRetry` agar transient connection error
 * otomatis di-retry + reconnect.
 */

/** Ambil semua pembelian dalam rentang tanggal (siklus). */
export async function getPurchasesInRange(
  startDate: Date,
  endDate: Date,
): Promise<Purchase[]> {
  return withRetry(() =>
    prisma.purchase.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "desc" },
    }),
  );
}

export interface CreatePurchaseData {
  name: string;
  categoryId: string;
  amount: number;
  note: string;
  date: Date;
}

/** Buat pembelian baru. */
export async function createPurchase(
  data: CreatePurchaseData,
): Promise<Purchase> {
  return withRetry(() =>
    prisma.purchase.create({
      data: {
        name: data.name,
        categoryId: data.categoryId,
        amount: new Prisma.Decimal(data.amount),
        note: data.note,
        date: data.date,
      },
    }),
  );
}

export interface UpdatePurchaseData {
  name?: string;
  categoryId?: string;
  amount?: number;
  note?: string;
  date?: Date;
}

/** Perbarui pembelian berdasarkan id. */
export async function updatePurchase(
  id: string,
  data: UpdatePurchaseData,
): Promise<Purchase> {
  const updateData: Prisma.PurchaseUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.amount !== undefined)
    updateData.amount = new Prisma.Decimal(data.amount);
  if (data.note !== undefined) updateData.note = data.note;
  if (data.date !== undefined) updateData.date = data.date;

  return withRetry(() =>
    prisma.purchase.update({
      where: { id },
      data: updateData,
    }),
  );
}

/** Hapus pembelian berdasarkan id. */
export async function deletePurchase(id: string): Promise<Purchase> {
  return withRetry(() =>
    prisma.purchase.delete({
      where: { id },
    }),
  );
}

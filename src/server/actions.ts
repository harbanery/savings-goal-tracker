"use server";

import { revalidatePath } from "next/cache";
import {
  createPurchase as createPurchaseService,
  deleteManyPurchases as deleteManyPurchasesService,
  deletePurchase as deletePurchaseService,
  getPurchasesInRange,
  updatePurchase as updatePurchaseService,
} from "@/services/budgetService";
import { toPurchases } from "@/helpers/purchaseTransformer";
import type { Purchase, PurchaseInput } from "@/models/types";
import type { CycleInfo } from "@/utils/cycleUtils";
import { shiftCycle } from "@/utils/cycleUtils";

/**
 * Server Actions untuk mutasi data Monthly Budget Tracker.
 */

function isCuid(id: string): boolean {
  return /^c[a-z0-9]{20,}$/i.test(id);
}

function validateAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  if (amount > 1e12) {
    throw new Error("Amount terlalu besar (maks 1 triliun).");
  }
}

function sanitizeText(text: string, maxLen: number): string {
  return text.trim().slice(0, maxLen);
}

/** Fetch semua pembelian dalam satu siklus (dipanggil dari Server Component). */
export async function getCyclePurchasesAction(
  cycle: CycleInfo,
): Promise<Purchase[]> {
  const records = await getPurchasesInRange(cycle.startDate, cycle.endDate);
  return toPurchases(records);
}

/**
 * Fetch pembelian untuk beberapa siklus terakhir (untuk chart historis).
 * Mengembalikan map label siklus -> daftar pembelian.
 * @param endCycle siklus akhir (termasuk)
 * @param count jumlah siklus yang diambil (termasuk endCycle)
 */
export async function getHistoricalPurchasesAction(
  endCycle: CycleInfo,
  count: number,
): Promise<Record<string, Purchase[]>> {
  const result: Record<string, Purchase[]> = {};
  let current = endCycle;
  const cycles: CycleInfo[] = [];
  for (let i = 0; i < count; i++) {
    cycles.push(current);
    current = shiftCycle(current, -1);
  }
  cycles.reverse(); // urutkan dari paling lama ke terbaru

  await Promise.all(
    cycles.map(async (c) => {
      try {
        result[c.label] = await getCyclePurchasesAction(c);
      } catch {
        result[c.label] = [];
      }
    }),
  );

  return result;
}

export async function createPurchaseAction(
  input: PurchaseInput,
): Promise<void> {
  const name = sanitizeText(input.name, 100);
  if (!name) throw new Error("Nama pembelian wajib diisi.");
  if (!input.categoryId) throw new Error("Kategori wajib dipilih.");
  validateAmount(input.amount);

  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal tidak valid.");
  }

  await createPurchaseService({
    name,
    categoryId: input.categoryId,
    amount: Math.round(input.amount),
    note: sanitizeText(input.note, 500),
    date,
  });
  revalidatePath("/");
}

export async function updatePurchaseAction(
  id: string,
  input: PurchaseInput,
): Promise<void> {
  if (!isCuid(id)) throw new Error(`Invalid purchase id: ${id}`);
  const name = sanitizeText(input.name, 100);
  if (!name) throw new Error("Nama pembelian wajib diisi.");
  if (!input.categoryId) throw new Error("Kategori wajib dipilih.");
  validateAmount(input.amount);

  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal tidak valid.");
  }

  await updatePurchaseService(id, {
    name,
    categoryId: input.categoryId,
    amount: Math.round(input.amount),
    note: sanitizeText(input.note, 500),
    date,
  });
  revalidatePath("/");
}

export async function deletePurchaseAction(id: string): Promise<void> {
  if (!isCuid(id)) throw new Error(`Invalid purchase id: ${id}`);
  await deletePurchaseService(id);
  revalidatePath("/");
}

/** Hapus banyak pembelian sekaligus. */
export async function deletePurchasesAction(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  for (const id of ids) {
    if (!isCuid(id)) throw new Error(`Invalid purchase id: ${id}`);
  }
  await deleteManyPurchasesService(ids);
  revalidatePath("/");
}

/**
 * Import massal pembelian dari array PurchaseInput (dari CSV).
 * Mengembalikan jumlah baris yang berhasil & daftar error.
 */
export async function importPurchasesAction(
  inputs: PurchaseInput[],
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  for (let i = 0; i < inputs.length; i++) {
    try {
      const input = inputs[i];
      const name = sanitizeText(input.name, 100);
      if (!name) throw new Error("Nama pembelian wajib diisi.");
      if (!input.categoryId) throw new Error("Kategori wajib dipilih.");
      validateAmount(input.amount);

      const date = new Date(input.date);
      if (Number.isNaN(date.getTime())) throw new Error("Tanggal tidak valid.");

      await createPurchaseService({
        name,
        categoryId: input.categoryId,
        amount: Math.round(input.amount),
        note: sanitizeText(input.note, 500),
        date,
      });
      imported++;
    } catch (err) {
      errors.push(
        `Baris ${i + 1}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (imported > 0) revalidatePath("/");
  return { imported, errors };
}

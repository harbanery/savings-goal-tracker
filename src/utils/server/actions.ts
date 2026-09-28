"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  createCategory,
  createSubcategory,
  createTransaction,
  deleteCategory,
  deleteManyTransactions,
  deleteSubcategory,
  deleteTransaction,
  getTransactionsInRange,
  updateCategory,
  updateSubcategory,
  updateTransaction,
  updateUserSettings,
  getUserCategories,
  getUserSettings,
} from "@/services/transaction";
import type {
  BudgetCategory,
  Transaction,
  TransactionInput,
  UserSettings,
} from "@/features/web/types";
import type { CycleInfo } from "@/features/web/utils/cycle";
import { shiftCycle } from "@/features/web/utils/cycle";

/**
 * Server Actions untuk mutasi data Savings Goal Tracker.
 * Semua aksi di-scope ke user login (sesi cookie); unauthorized → throw.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized — silakan login kembali.");
  return user.id;
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

function validateInput(input: TransactionInput): void {
  if (!["EXPENSE", "INCOME", "TRANSFER"].includes(input.type)) {
    throw new Error("Jenis transaksi tidak valid.");
  }
  if (!input.categoryId || !isUuid(input.categoryId)) {
    throw new Error("Wadah wajib dipilih.");
  }
  if (input.type === "TRANSFER") {
    if (!input.toCategoryId || !isUuid(input.toCategoryId)) {
      throw new Error("Wadah tujuan wajib dipilih.");
    }
    if (input.toCategoryId === input.categoryId) {
      throw new Error("Wadah sumber dan tujuan harus berbeda.");
    }
  }
  validateAmount(input.amount);
}

/** Fetch semua transaksi dalam satu siklus (dipanggil dari client). */
export async function getCycleTransactionsAction(
  cycle: CycleInfo,
): Promise<Transaction[]> {
  const userId = await requireUserId();
  return getTransactionsInRange(userId, cycle.startDate, cycle.endDate);
}

/**
 * Fetch transaksi untuk beberapa siklus terakhir (untuk chart historis).
 * Mengembalikan map label siklus -> daftar transaksi.
 */
export async function getHistoricalTransactionsAction(
  endCycle: CycleInfo,
  count: number,
): Promise<Record<string, Transaction[]>> {
  const userId = await requireUserId();
  const result: Record<string, Transaction[]> = {};
  let current = endCycle;
  const cycles: CycleInfo[] = [];
  for (let i = 0; i < count; i++) {
    cycles.push(current);
    current = shiftCycle(current, -1);
  }
  cycles.reverse();

  await Promise.all(
    cycles.map(async (c) => {
      try {
        result[c.key] = await getTransactionsInRange(
          userId,
          c.startDate,
          c.endDate,
        );
      } catch {
        result[c.key] = [];
      }
    }),
  );

  return result;
}

/** Kategori + settings user (untuk refresh client setelah perubahan). */
export async function getFinanceBundleAction(): Promise<{
  categories: BudgetCategory[];
  settings: UserSettings;
}> {
  const userId = await requireUserId();
  const [categories, settings] = await Promise.all([
    getUserCategories(userId),
    getUserSettings(userId),
  ]);
  return { categories, settings };
}

export async function createTransactionAction(
  input: TransactionInput,
): Promise<void> {
  const userId = await requireUserId();
  const name = sanitizeText(input.name, 100);
  if (!name) throw new Error("Nama transaksi wajib diisi.");
  validateInput(input);

  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal tidak valid.");
  }

  await createTransaction(userId, {
    type: input.type,
    name,
    amount: Math.round(input.amount),
    note: sanitizeText(input.note, 500),
    date,
    categoryId: input.categoryId,
    subcategoryId: isUuid(input.subcategoryId ?? "")
      ? input.subcategoryId
      : null,
    toCategoryId: isUuid(input.toCategoryId ?? "") ? input.toCategoryId : null,
  });
  revalidatePath("/");
}

export async function updateTransactionAction(
  id: string,
  input: TransactionInput,
): Promise<void> {
  const userId = await requireUserId();
  if (!isUuid(id)) throw new Error(`Invalid transaction id: ${id}`);
  const name = sanitizeText(input.name, 100);
  if (!name) throw new Error("Nama transaksi wajib diisi.");
  validateInput(input);

  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal tidak valid.");
  }

  await updateTransaction(userId, id, {
    type: input.type,
    name,
    amount: Math.round(input.amount),
    note: sanitizeText(input.note, 500),
    date,
    categoryId: input.categoryId,
    subcategoryId: isUuid(input.subcategoryId ?? "")
      ? input.subcategoryId
      : null,
    toCategoryId: isUuid(input.toCategoryId ?? "") ? input.toCategoryId : null,
  });
  revalidatePath("/");
}

export async function deleteTransactionAction(id: string): Promise<void> {
  const userId = await requireUserId();
  if (!isUuid(id)) throw new Error(`Invalid transaction id: ${id}`);
  await deleteTransaction(userId, id);
  revalidatePath("/");
}

/** Hapus banyak transaksi sekaligus. */
export async function deleteTransactionsAction(ids: string[]): Promise<void> {
  const userId = await requireUserId();
  if (ids.length === 0) return;
  for (const id of ids) {
    if (!isUuid(id)) throw new Error(`Invalid transaction id: ${id}`);
  }
  await deleteManyTransactions(userId, ids);
  revalidatePath("/");
}

/**
 * Import massal transaksi dari array TransactionInput (dari CSV).
 * Mengembalikan jumlah baris yang berhasil & daftar error.
 */
export async function importTransactionsAction(
  inputs: TransactionInput[],
): Promise<{ imported: number; errors: string[] }> {
  const userId = await requireUserId();
  const errors: string[] = [];
  let imported = 0;

  for (let i = 0; i < inputs.length; i++) {
    try {
      const input = inputs[i];
      const name = sanitizeText(input.name, 100);
      if (!name) throw new Error("Nama transaksi wajib diisi.");
      validateInput(input);

      const date = new Date(input.date);
      if (Number.isNaN(date.getTime())) throw new Error("Tanggal tidak valid.");

      await createTransaction(userId, {
        type: input.type,
        name,
        amount: Math.round(input.amount),
        note: sanitizeText(input.note, 500),
        date,
        categoryId: input.categoryId,
        subcategoryId: isUuid(input.subcategoryId ?? "")
          ? input.subcategoryId
          : null,
        toCategoryId: isUuid(input.toCategoryId ?? "")
          ? input.toCategoryId
          : null,
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

// ---------------------------------------------------------------------------
// Settings & kategori (dinamis per user)
// ---------------------------------------------------------------------------

export async function updateSettingsAction(data: {
  cycleStartDay?: number;
  savingsInitial?: number;
}): Promise<UserSettings> {
  const userId = await requireUserId();
  const settings = await updateUserSettings(userId, data);
  revalidatePath("/");
  revalidatePath("/settings");
  return settings;
}

export async function createCategoryAction(data: {
  name: string;
  color: string;
  allocation: number;
}): Promise<BudgetCategory> {
  const userId = await requireUserId();
  const name = sanitizeText(data.name, 50);
  if (!name) throw new Error("Nama kategori wajib diisi.");
  const category = await createCategory(userId, {
    name,
    color: data.color,
    allocation: data.allocation,
  });
  revalidatePath("/");
  revalidatePath("/settings");
  return category;
}

export async function updateCategoryAction(
  categoryId: string,
  data: { name?: string; color?: string; allocation?: number },
): Promise<void> {
  const userId = await requireUserId();
  if (!isUuid(categoryId)) throw new Error("Invalid category id.");
  if (data.name !== undefined) data.name = sanitizeText(data.name, 50);
  await updateCategory(userId, categoryId, data);
  revalidatePath("/");
  revalidatePath("/settings");
}

export async function deleteCategoryAction(categoryId: string): Promise<void> {
  const userId = await requireUserId();
  if (!isUuid(categoryId)) throw new Error("Invalid category id.");
  await deleteCategory(userId, categoryId);
  revalidatePath("/");
  revalidatePath("/settings");
}

export async function createSubcategoryAction(
  categoryId: string,
  name: string,
): Promise<void> {
  const userId = await requireUserId();
  if (!isUuid(categoryId)) throw new Error("Invalid category id.");
  const clean = sanitizeText(name, 50);
  if (!clean) throw new Error("Nama subkategori wajib diisi.");
  await createSubcategory(userId, categoryId, clean);
  revalidatePath("/");
  revalidatePath("/settings");
}

export async function deleteSubcategoryAction(
  subcategoryId: string,
): Promise<void> {
  const userId = await requireUserId();
  if (!isUuid(subcategoryId)) throw new Error("Invalid subcategory id.");
  await deleteSubcategory(userId, subcategoryId);
  revalidatePath("/");
  revalidatePath("/settings");
}

export async function updateSubcategoryAction(
  subcategoryId: string,
  name: string,
): Promise<void> {
  const userId = await requireUserId();
  if (!isUuid(subcategoryId)) throw new Error("Invalid subcategory id.");
  const clean = sanitizeText(name, 50);
  if (!clean) throw new Error("Nama subkategori wajib diisi.");
  await updateSubcategory(userId, subcategoryId, clean);
  revalidatePath("/");
  revalidatePath("/settings");
}

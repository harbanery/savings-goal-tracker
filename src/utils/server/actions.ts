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
  getTransactionById,
  getTransactionsInRange,
  updateCategory,
  updateSubcategory,
  updateTransaction,
  updateUserSettings,
  getUserCategories,
  getUserSettings,
} from "@/services/transaction";
import {
  createRecurringRule,
  createRecurringWithFirstTransaction,
  deleteRecurringRule,
  getRecurringRules,
  materializeRecurringForCycle,
  setRecurringActive,
} from "@/services/recurring";
import {
  addTargetFunds,
  assertSavingsProtection,
  assertWalletLimit,
  createTarget,
  deleteTarget,
  getBudgetOverview,
  getTargets,
  updateTarget,
} from "@/services/finance";
import type {
  BudgetCategory,
  BudgetOverview,
  RecurringRule,
  SavingsTarget,
  Transaction,
  TransactionInput,
  UserSettings,
  WalletType,
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

/**
 * Fetch semua transaksi dalam satu siklus (dipanggil dari client).
 * Aturan transaksi berulang dimaterialisasi lebih dulu (idempoten).
 */
export async function getCycleTransactionsAction(
  cycle: CycleInfo,
): Promise<Transaction[]> {
  const userId = await requireUserId();
  await materializeRecurringForCycle(userId, cycle);
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
        await materializeRecurringForCycle(userId, c);
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

/** Kategori saja (halaman Kebutuhan — refresh daftar wadah & subkategori). */
export async function getUserCategoriesAction(): Promise<BudgetCategory[]> {
  const userId = await requireUserId();
  return getUserCategories(userId);
}

/**
 * Buat transaksi baru.
 * - `options.force`: lewati proteksi tabungan (konfirmasi "terpaksa").
 * - `options.recurring`: sekalian buat aturan berulang bulanan dengan
 *   tanggal jalur = tanggal transaksi (hanya EXPENSE/INCOME).
 */
export async function createTransactionAction(
  input: TransactionInput,
  options?: { force?: boolean; recurring?: boolean },
): Promise<void> {
  const userId = await requireUserId();
  const name = sanitizeText(input.name, 100);
  if (!name) throw new Error("Nama transaksi wajib diisi.");
  validateInput(input);

  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal tidak valid.");
  }

  // Proteksi tabungan (Budget): pengeluaran tidak boleh menyentuh tabungan
  // dilindungi tanpa konfirmasi terpaksa dari user.
  await assertSavingsProtection(userId, date, input.amount, options?.force ?? false);

  // Batas wadah (insight DROID.md): hanya PENGELUARAN yang dibatasi —
  // pemasukan (INCOME) dan transfer (TRANSFER) bebas melewati batas.
  if (input.type === "EXPENSE") {
    await assertWalletLimit(
      userId,
      input.categoryId,
      date,
      Math.round(input.amount),
    );
  }

  const subcategoryId = isUuid(input.subcategoryId ?? "")
    ? input.subcategoryId
    : null;

  if (options?.recurring && input.type !== "TRANSFER") {
    await createRecurringWithFirstTransaction(userId, {
      type: input.type,
      name,
      amount: Math.round(input.amount),
      dayOfMonth: date.getDate(),
      categoryId: input.categoryId,
      subcategoryId,
      note: sanitizeText(input.note, 500),
      date,
    });
    revalidatePath("/");
    return;
  }

  await createTransaction(userId, {
    type: input.type,
    name,
    amount: Math.round(input.amount),
    note: sanitizeText(input.note, 500),
    date,
    categoryId: input.categoryId,
    subcategoryId,
    toCategoryId: isUuid(input.toCategoryId ?? "") ? input.toCategoryId : null,
  });
  revalidatePath("/");
}

export async function updateTransactionAction(
  id: string,
  input: TransactionInput,
  force?: boolean,
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

  // Proteksi tabungan: hitung delta pengeluaran terhadap transaksi lama.
  const old = await getTransactionById(userId, id);
  if (!old) throw new Error("Transaksi tidak ditemukan.");
  const oldExpense = old.type === "EXPENSE" ? old.amount : 0;
  const newExpense = input.type === "EXPENSE" ? input.amount : 0;
  await assertSavingsProtection(
    userId,
    date,
    newExpense - oldExpense,
    force ?? false,
  );

  // Batas wadah: hanya EXPENSE yang dihitung — nilai lama pun hanya bila
  // pengeluaran dari wadah yang sama (edit tidak boleh "membebaskan" batas).
  if (input.type === "EXPENSE") {
    const oldExpenseSameCategory =
      old.categoryId === input.categoryId && old.type === "EXPENSE"
        ? old.amount
        : 0;
    await assertWalletLimit(
      userId,
      input.categoryId,
      date,
      Math.round(input.amount - oldExpenseSameCategory),
    );
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
  protectedSavings?: number;
}): Promise<UserSettings> {
  const userId = await requireUserId();
  const settings = await updateUserSettings(userId, data);
  revalidatePath("/");
  revalidatePath("/budget");
  revalidatePath("/finance");
  revalidatePath("/needs");
  return settings;
}

export async function createCategoryAction(data: {
  name: string;
  color: string;
  allocation: number;
  walletType?: WalletType;
}): Promise<BudgetCategory> {
  const userId = await requireUserId();
  const name = sanitizeText(data.name, 50);
  if (!name) throw new Error("Nama kategori wajib diisi.");
  const category = await createCategory(userId, {
    name,
    color: data.color,
    allocation: data.allocation,
    walletType: data.walletType,
  });
  revalidatePath("/");
  revalidatePath("/budget");
  revalidatePath("/finance");
  revalidatePath("/needs");
  return category;
}

export async function updateCategoryAction(
  categoryId: string,
  data: {
    name?: string;
    color?: string;
    allocation?: number;
    walletType?: WalletType;
  },
): Promise<void> {
  const userId = await requireUserId();
  if (!isUuid(categoryId)) throw new Error("Invalid category id.");
  if (data.name !== undefined) data.name = sanitizeText(data.name, 50);
  await updateCategory(userId, categoryId, data);
  revalidatePath("/");
  revalidatePath("/budget");
  revalidatePath("/finance");
  revalidatePath("/needs");
}

export async function deleteCategoryAction(categoryId: string): Promise<void> {
  const userId = await requireUserId();
  if (!isUuid(categoryId)) throw new Error("Invalid category id.");
  await deleteCategory(userId, categoryId);
  revalidatePath("/");
  revalidatePath("/budget");
  revalidatePath("/finance");
  revalidatePath("/needs");
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
  revalidatePath("/budget");
  revalidatePath("/finance");
  revalidatePath("/needs");
}

export async function deleteSubcategoryAction(
  subcategoryId: string,
): Promise<void> {
  const userId = await requireUserId();
  if (!isUuid(subcategoryId)) throw new Error("Invalid subcategory id.");
  await deleteSubcategory(userId, subcategoryId);
  revalidatePath("/");
  revalidatePath("/budget");
  revalidatePath("/finance");
  revalidatePath("/needs");
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
  revalidatePath("/budget");
  revalidatePath("/finance");
  revalidatePath("/needs");
}

// ---------------------------------------------------------------------------
// Keuangan: Budget (proteksi tabungan) & Target tabungan
// ---------------------------------------------------------------------------

/** Ringkasan Budget satu siklus (dipanggil dari client). */
export async function getBudgetOverviewAction(
  cycle: CycleInfo,
): Promise<BudgetOverview> {
  const userId = await requireUserId();
  return getBudgetOverview(userId, cycle);
}

export async function getTargetsAction(): Promise<SavingsTarget[]> {
  const userId = await requireUserId();
  return getTargets(userId);
}

export async function createTargetAction(data: {
  name: string;
  targetAmount: number;
  deadline?: string | null;
  note?: string;
}): Promise<SavingsTarget> {
  const userId = await requireUserId();
  const deadline = parseDeadline(data.deadline);
  const target = await createTarget(userId, {
    name: sanitizeText(data.name, 100),
    targetAmount: data.targetAmount,
    deadline,
    note: data.note,
  });
  revalidatePath("/target");
  return target;
}

export async function updateTargetAction(
  id: string,
  data: {
    name: string;
    targetAmount: number;
    deadline?: string | null;
    note?: string;
  },
): Promise<void> {
  const userId = await requireUserId();
  if (!isUuid(id)) throw new Error("Invalid target id.");
  const deadline = parseDeadline(data.deadline);
  await updateTarget(userId, id, {
    name: sanitizeText(data.name, 100),
    targetAmount: data.targetAmount,
    deadline,
    note: data.note,
  });
  revalidatePath("/target");
}

export async function deleteTargetAction(id: string): Promise<void> {
  const userId = await requireUserId();
  if (!isUuid(id)) throw new Error("Invalid target id.");
  await deleteTarget(userId, id);
  revalidatePath("/target");
}

/** Tambah dana terkumpul pada target. */
export async function addTargetFundsAction(
  id: string,
  amount: number,
): Promise<SavingsTarget> {
  const userId = await requireUserId();
  if (!isUuid(id)) throw new Error("Invalid target id.");
  const target = await addTargetFunds(userId, id, amount);
  revalidatePath("/target");
  return target;
}

function parseDeadline(deadline?: string | null): Date | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) throw new Error("Batas waktu tidak valid.");
  return d;
}

// ---------------------------------------------------------------------------
// Transaksi berulang
// ---------------------------------------------------------------------------

export async function getRecurringRulesAction(): Promise<RecurringRule[]> {
  const userId = await requireUserId();
  return getRecurringRules(userId);
}

/** Aktifkan/nonaktifkan aturan berulang. */
export async function toggleRecurringAction(
  id: string,
  active: boolean,
): Promise<void> {
  const userId = await requireUserId();
  if (!isUuid(id)) throw new Error("Invalid recurring id.");
  await setRecurringActive(userId, id, active);
  revalidatePath("/");
}

/** Hapus aturan berulang (transaksi yang sudah tercatat tetap ada). */
export async function deleteRecurringAction(id: string): Promise<void> {
  const userId = await requireUserId();
  if (!isUuid(id)) throw new Error("Invalid recurring id.");
  await deleteRecurringRule(userId, id);
  revalidatePath("/");
}

/** Buat aturan berulang mandiri (tanpa transaksi pertama). */
export async function createRecurringRuleAction(data: {
  type: string;
  name: string;
  amount: number;
  dayOfMonth: number;
  categoryId: string;
  subcategoryId?: string | null;
  note?: string;
}): Promise<RecurringRule> {
  const userId = await requireUserId();
  const name = sanitizeText(data.name, 100);
  if (!name) throw new Error("Nama transaksi wajib diisi.");
  if (!isUuid(data.categoryId)) throw new Error("Wadah wajib dipilih.");
  const rule = await createRecurringRule(userId, {
    type: data.type as "EXPENSE" | "INCOME",
    name,
    amount: data.amount,
    dayOfMonth: data.dayOfMonth,
    categoryId: data.categoryId,
    subcategoryId: isUuid(data.subcategoryId ?? "")
      ? data.subcategoryId
      : null,
    note: sanitizeText(data.note ?? "", 500),
  });
  revalidatePath("/");
  return rule;
}

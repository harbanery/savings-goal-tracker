import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { prisma, withRetry } from "@/lib/prisma";
import type {
  BudgetCategory,
  Transaction,
  TransactionType,
  UserSettings,
  WalletType,
} from "@/features/web/types";

/**
 * Data-access layer transaksi & kategori & settings (semua query
 * di-scope per user).
 */

type TransactionRecord = Prisma.TransactionGetPayload<object>;

/** Ubah record DB menjadi Transaction UI (Decimal → number, Date → ISO). */
export function toTransaction(t: TransactionRecord): Transaction {
  return {
    id: t.id,
    type: t.type as TransactionType,
    name: t.name,
    amount: Number(t.amount),
    note: t.note,
    date: t.date.toISOString(),
    categoryId: t.categoryId,
    subcategoryId: t.subcategoryId,
    toCategoryId: t.toCategoryId,
    recurringId: t.recurringId,
  };
}

/** Kategori user (+ subkategori terurut) sebagai BudgetCategory UI. */
export async function getUserCategories(userId: string): Promise<BudgetCategory[]> {
  const rows = await withRetry(() =>
    prisma.category.findMany({
      where: { userId },
      orderBy: { order: "asc" },
      include: { subcategories: { orderBy: { order: "asc" } } },
    }),
  );
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    walletType: c.walletType,
    allocation: Number(c.allocation),
    subcategories: c.subcategories.map((s) => ({ id: s.id, name: s.name })),
  }));
}

/** Settings user (dengan fallback default bila belum ada). */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  const s = await withRetry(() =>
    prisma.userSettings.findUnique({ where: { userId } }),
  );
  return {
    cycleStartDay: s?.cycleStartDay ?? 25,
    savingsInitial: s ? Number(s.savingsInitial) : 0,
    protectedSavings: s ? Number(s.protectedSavings) : 0,
  };
}

/** Ambil satu transaksi milik user (null bila tidak ada). */
export async function getTransactionById(
  userId: string,
  id: string,
): Promise<Transaction | null> {
  const row = await withRetry(() =>
    prisma.transaction.findFirst({ where: { id, userId } }),
  );
  return row ? toTransaction(row) : null;
}

/** Ambil semua transaksi user dalam rentang tanggal (siklus). */
export async function getTransactionsInRange(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<Transaction[]> {
  const rows = await withRetry(() =>
    prisma.transaction.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: "desc" },
    }),
  );
  return rows.map(toTransaction);
}

async function assertCategoryOwned(
  userId: string,
  categoryId: string,
): Promise<void> {
  const owned = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  if (!owned) throw new Error("Kategori tidak ditemukan.");
}

export interface CreateTransactionData {
  type: TransactionType;
  name: string;
  amount: number;
  note: string;
  date: Date;
  categoryId: string;
  subcategoryId?: string | null;
  toCategoryId?: string | null;
}

/** Buat transaksi baru milik user. */
export async function createTransaction(
  userId: string,
  data: CreateTransactionData,
): Promise<Transaction> {
  await assertCategoryOwned(userId, data.categoryId);
  if (data.type === "TRANSFER") {
    if (!data.toCategoryId) throw new Error("Wadah tujuan wajib dipilih.");
    if (data.toCategoryId === data.categoryId) {
      throw new Error("Wadah sumber dan tujuan harus berbeda.");
    }
    await assertCategoryOwned(userId, data.toCategoryId);
  }
  const row = await withRetry(() =>
    prisma.transaction.create({
      data: {
        userId,
        type: data.type,
        name: data.name,
        amount: new Prisma.Decimal(data.amount),
        note: data.note,
        date: data.date,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId ?? null,
        toCategoryId: data.toCategoryId ?? null,
      },
    }),
  );
  return toTransaction(row);
}

export interface UpdateTransactionData {
  type?: TransactionType;
  name?: string;
  amount?: number;
  note?: string;
  date?: Date;
  categoryId?: string;
  subcategoryId?: string | null;
  toCategoryId?: string | null;
}

/** Perbarui transaksi user berdasarkan id. */
export async function updateTransaction(
  userId: string,
  id: string,
  data: UpdateTransactionData,
): Promise<Transaction> {
  const existing = await prisma.transaction.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new Error("Transaksi tidak ditemukan.");

  const update: Prisma.TransactionUpdateInput = {};
  if (data.type !== undefined) update.type = data.type;
  if (data.name !== undefined) update.name = data.name;
  if (data.amount !== undefined)
    update.amount = new Prisma.Decimal(data.amount);
  if (data.note !== undefined) update.note = data.note;
  if (data.date !== undefined) update.date = data.date;

  const nextCategoryId = data.categoryId;
  const nextToCategoryId = data.toCategoryId;
  const finalType = data.type ?? (await getType(prisma, id));
  if (nextCategoryId !== undefined) {
    await assertCategoryOwned(userId, nextCategoryId);
    update.category = { connect: { id: nextCategoryId } };
  }
  if (finalType === "TRANSFER") {
    if (nextToCategoryId !== undefined) {
      if (!nextToCategoryId) throw new Error("Wadah tujuan wajib dipilih.");
      if (nextToCategoryId === (nextCategoryId ?? "")) {
        throw new Error("Wadah sumber dan tujuan harus berbeda.");
      }
      await assertCategoryOwned(userId, nextToCategoryId);
      update.toCategory = { connect: { id: nextToCategoryId } };
    }
  } else if (nextToCategoryId !== undefined) {
    update.toCategory = { disconnect: true } as Prisma.TransactionUpdateInput["toCategory"];
  }
  if (data.subcategoryId !== undefined) {
    update.subcategory = data.subcategoryId
      ? { connect: { id: data.subcategoryId } }
      : ({ disconnect: true } as Prisma.TransactionUpdateInput["subcategory"]);
  }

  const row = await withRetry(() =>
    prisma.transaction.update({ where: { id }, data: update }),
  );
  return toTransaction(row);
}

async function getType(
  p: PrismaClient,
  id: string,
): Promise<TransactionType> {
  const row = await p.transaction.findUniqueOrThrow({
    where: { id },
    select: { type: true },
  });
  return row.type as TransactionType;
}

/** Hapus transaksi user. */
export async function deleteTransaction(userId: string, id: string): Promise<void> {
  const existing = await prisma.transaction.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new Error("Transaksi tidak ditemukan.");
  await withRetry(() => prisma.transaction.delete({ where: { id } }));
}

/** Hapus banyak transaksi user sekaligus. */
export async function deleteManyTransactions(
  userId: string,
  ids: string[],
): Promise<number> {
  const result = await withRetry(() =>
    prisma.transaction.deleteMany({ where: { id: { in: ids }, userId } }),
  );
  return result.count;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** Perbarui settings user (cycle start day / saldo awal / tabungan dilindungi). */
export async function updateUserSettings(
  userId: string,
  data: {
    cycleStartDay?: number;
    savingsInitial?: number;
    protectedSavings?: number;
  },
): Promise<UserSettings> {
  const patch: Prisma.UserSettingsUpdateInput = {};
  if (data.cycleStartDay !== undefined) {
    if (!Number.isInteger(data.cycleStartDay) || data.cycleStartDay < 1 || data.cycleStartDay > 28) {
      throw new Error("Tanggal mulai siklus harus 1-28.");
    }
    patch.cycleStartDay = data.cycleStartDay;
  }
  if (data.savingsInitial !== undefined) {
    if (!Number.isFinite(data.savingsInitial) || data.savingsInitial < 0) {
      throw new Error("Saldo awal tidak valid.");
    }
    patch.savingsInitial = new Prisma.Decimal(
      Math.round(data.savingsInitial),
    );
  }
  if (data.protectedSavings !== undefined) {
    if (!Number.isFinite(data.protectedSavings) || data.protectedSavings < 0) {
      throw new Error("Tabungan dilindungi tidak valid.");
    }
    patch.protectedSavings = new Prisma.Decimal(
      Math.round(data.protectedSavings),
    );
  }
  const row = await withRetry(() =>
    prisma.userSettings.upsert({
      where: { userId },
      update: patch,
      create: {
        userId,
        cycleStartDay: data.cycleStartDay ?? 25,
        savingsInitial: Math.round(data.savingsInitial ?? 0),
        protectedSavings: Math.round(data.protectedSavings ?? 0),
      },
    }),
  );
  return {
    cycleStartDay: row.cycleStartDay,
    savingsInitial: Number(row.savingsInitial),
    protectedSavings: Number(row.protectedSavings),
  };
}

// ---------------------------------------------------------------------------
// Kategori & subkategori CRUD (dinamis per user)
// ---------------------------------------------------------------------------

export async function createCategory(
  userId: string,
  data: {
    name: string;
    color: string;
    walletType?: WalletType;
  },
): Promise<BudgetCategory> {
  // Wadah CASH bawaan tidak boleh dibuat manual (dibuat otomatis per user).
  if (data.walletType && data.walletType !== "BANK" && data.walletType !== "E_WALLET") {
    throw new Error("Jenis dompet tidak valid.");
  }
  const count = await prisma.category.count({ where: { userId } });
  const row = await withRetry(() =>
    prisma.category.create({
      data: {
        userId,
        name: data.name,
        color: data.color,
        walletType: data.walletType ?? "E_WALLET",
        // Alokasi tidak bisa diisi manual — dana wadah murni lewat
        // pemasukan/transfer (insight DROID.md).
        allocation: new Prisma.Decimal(0),
        order: count,
      },
      include: { subcategories: { orderBy: { order: "asc" } } },
    }),
  );
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    walletType: row.walletType,
    allocation: Number(row.allocation),
    subcategories: row.subcategories.map((s) => ({ id: s.id, name: s.name })),
  };
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  data: {
    name?: string;
    color?: string;
    walletType?: WalletType;
  },
): Promise<void> {
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true, name: true, walletType: true },
  });
  if (!existing) throw new Error("Kategori tidak ditemukan.");
  // Wadah "Cash" (CASH) adalah wadah bawaan — nama & jenisnya terkunci;
  // hanya warnanya yang bisa diubah. Nama yang sama (idempoten) dibiarkan.
  // (Alokasi pun tidak bisa diubah — dana wadah lewat pemasukan/transfer.)
  if (existing.walletType === "CASH") {
    const renaming = data.name !== undefined && data.name !== existing.name;
    if (renaming || data.walletType !== undefined) {
      throw new Error(
        "Wadah Cash bawaan tidak bisa diubah nama/jenisnya — hanya warnanya.",
      );
    }
  }
  const patch: Prisma.CategoryUpdateInput = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.color !== undefined) patch.color = data.color;
  if (data.walletType !== undefined) {
    if (data.walletType !== "BANK" && data.walletType !== "E_WALLET") {
      throw new Error("Jenis dompet tidak valid.");
    }
    patch.walletType = data.walletType;
  }
  await withRetry(() =>
    prisma.category.update({ where: { id: categoryId }, data: patch }),
  );
}

/** Hapus kategori — ditolak bila masih dipakai transaksi/aturan berulang. */
export async function deleteCategory(userId: string, categoryId: string): Promise<void> {
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true, walletType: true },
  });
  if (!existing) throw new Error("Kategori tidak ditemukan.");
  // Wadah "Cash" (CASH) adalah wadah bawaan — tidak bisa dihapus.
  if (existing.walletType === "CASH") {
    throw new Error("Wadah Cash bawaan tidak bisa dihapus.");
  }
  const used = await prisma.transaction.count({
    where: {
      userId,
      OR: [{ categoryId }, { toCategoryId: categoryId }],
    },
  });
  if (used > 0) {
    throw new Error("Kategori masih dipakai transaksi; hapus/pindahkan transaksinya dulu.");
  }
  const usedRecurring = await prisma.recurringTransaction.count({
    where: { userId, categoryId },
  });
  if (usedRecurring > 0) {
    throw new Error("Kategori masih dipakai transaksi berulang; hapus aturannya dulu.");
  }
  await withRetry(() => prisma.category.delete({ where: { id: categoryId } }));
}

export async function createSubcategory(
  userId: string,
  categoryId: string,
  name: string,
): Promise<void> {
  await assertCategoryOwned(userId, categoryId);
  const count = await prisma.subcategory.count({ where: { categoryId } });
  await withRetry(() =>
    prisma.subcategory.create({ data: { categoryId, name, order: count } }),
  );
}

/** Ubah nama subkategori milik user. */
export async function updateSubcategory(
  userId: string,
  subcategoryId: string,
  name: string,
): Promise<void> {
  const sub = await prisma.subcategory.findFirst({
    where: { id: subcategoryId, category: { userId } },
    select: { id: true },
  });
  if (!sub) throw new Error("Subkategori tidak ditemukan.");
  await withRetry(() =>
    prisma.subcategory.update({ where: { id: subcategoryId }, data: { name } }),
  );
}

export async function deleteSubcategory(
  userId: string,
  subcategoryId: string,
): Promise<void> {
  const sub = await prisma.subcategory.findFirst({
    where: { id: subcategoryId, category: { userId } },
    select: { id: true },
  });
  if (!sub) throw new Error("Subkategori tidak ditemukan.");
  const used = await prisma.transaction.count({
    where: { userId, subcategoryId },
  });
  if (used > 0) {
    throw new Error("Subkategori masih dipakai transaksi.");
  }
  await withRetry(() =>
    prisma.subcategory.delete({ where: { id: subcategoryId } }),
  );
}

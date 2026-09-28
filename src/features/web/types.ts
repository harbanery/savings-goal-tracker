/**
 * Tipe data UI untuk Savings Goal Tracker (multi-user, multi-tipe transaksi).
 */

/** Jenis transaksi keuangan. */
export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER";

/** Subkategori/unit pencatatan dalam satu kategori/wadah. */
export interface BudgetSubcategory {
  id: string;
  name: string;
}

/** Kategori/wadah alokasi milik user (dinamis dari DB). */
export interface BudgetCategory {
  id: string;
  name: string;
  color: string;
  /** Alokasi saldo per siklus (rupiah). */
  allocation: number;
  subcategories: BudgetSubcategory[];
}

/** Pengaturan keuangan user (dinamis dari DB). */
export interface UserSettings {
  /** Tanggal mulai siklus per bulan (1-28). */
  cycleStartDay: number;
  /** Saldo/modal awal per siklus. */
  savingsInitial: number;
}

/** User sesi login (Google). */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  settings: UserSettings | null;
}

/** Satu transaksi keuangan (pengeluaran/pemasukan/transfer). */
export interface Transaction {
  id: string;
  type: TransactionType;
  name: string;
  /** Nominal selalu positif. */
  amount: number;
  note: string;
  /** ISO datetime transaksi. */
  date: string;
  /** Wadah utama: sumber (EXPENSE/TRANSFER) atau tujuan (INCOME). */
  categoryId: string;
  /** Unit pencatatan opsional. */
  subcategoryId: string | null;
  /** Wadah tujuan khusus TRANSFER. */
  toCategoryId: string | null;
}

/** Input untuk membuat/memperbarui transaksi. */
export interface TransactionInput {
  type: TransactionType;
  name: string;
  amount: number;
  note: string;
  date: string;
  categoryId: string;
  subcategoryId?: string | null;
  toCategoryId?: string | null;
}

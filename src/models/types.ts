/**
 * Tipe data UI untuk Monthly Budget Tracker.
 */

/** Kategori/wadah sistem dengan alokasi saldo. */
export interface BudgetCategory {
  id: string;
  label: string;
  description: string;
  color: string;
  /** Alokasi saldo per siklus (rupiah). */
  allocation: number;
  /** Jika true, kategori ini tidak masuk perhitungan alokasi wadah (mis. Belanja). */
  excludeFromAllocation?: boolean;
}

/** Satu catatan pembelian/pengeluaran. */
export interface Purchase {
  id: string;
  /** Nama pembelian. */
  name: string;
  /** ID kategori/wadah. */
  categoryId: string;
  /** Jumlah biaya (rupiah). */
  amount: number;
  /** Catatan opsional. */
  note: string;
  /** ISO datetime pembelian. */
  date: string;
}

/** Input untuk membuat/memperbarui pembelian. */
export interface PurchaseInput {
  name: string;
  categoryId: string;
  amount: number;
  note: string;
  date: string;
}

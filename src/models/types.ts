/**
 * Tipe data UI untuk Monthly Budget Tracker.
 */

/** Locale yang didukung aplikasi. */
export type Locale = "id" | "en";

/** Teks yang tersedia dalam kedua bahasa. */
export type LocaleText = { id: string; en: string };

/**
 * Subkategori dalam satu kategori/wadah (mis. "Bensin" di dalam Cash).
 * Nilai subkategori terakumulasi ke alokasi kategori induknya.
 */
export interface BudgetSubcategory {
  id: string;
  label: LocaleText;
  /** Catatan singkat opsional. */
  description?: LocaleText;
}

/** Kategori/wadah sistem dengan alokasi saldo. */
export interface BudgetCategory {
  id: string;
  label: LocaleText;
  description: LocaleText;
  color: string;
  /** Alokasi saldo per siklus (rupiah). */
  allocation: number;
  /**
   * Subkategori di dalam wadah ini. Kategori tanpa subkategori
   * (mis. Jenius - Langganan) memakai ID kategori itu sendiri
   * sebagai unit pencatatan.
   */
  subcategories?: BudgetSubcategory[];
  /** Jika true, kategori ini tidak masuk perhitungan alokasi wadah (mis. Belanja). */
  excludeFromAllocation?: boolean;
}

/**
 * Unit pencatatan pembelian: subkategori (untuk kategori yang punya
 * subkategori) atau kategori itu sendiri (untuk yang tidak punya).
 * Purchase.categoryId menyimpan ID unit ini.
 */
export interface BudgetUnit {
  id: string;
  label: LocaleText;
  description?: LocaleText;
  /** ID kategori/wadah induk. */
  categoryId: string;
  color: string;
}

/** Satu catatan pembelian/pengeluaran. */
export interface Purchase {
  id: string;
  /** Nama pembelian. */
  name: string;
  /** ID subkategori/unit pencatatan (mis. "kos", "gopay-ojol"). */
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

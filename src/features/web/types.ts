/**
 * Tipe data UI untuk Savings Goal Tracker (multi-user, multi-tipe transaksi).
 */

/** Jenis transaksi keuangan. */
export type TransactionType = "EXPENSE" | "INCOME" | "TRANSFER";

/**
 * Jenis dompet/wadah: rekening bank, dompet digital (e-wallet), atau uang
 * tunai (CASH — wadah bawaan "Cash", satu per user, tidak bisa ditambah/
 * dihapus lewat UI).
 */
export type WalletType = "BANK" | "E_WALLET" | "CASH";

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
  /** Jenis dompet: bank atau e-wallet. */
  walletType: WalletType;
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
  /** ISO date transaksi (hari kanonik: tengah malam UTC "…T00:00:00.000Z"). */
  date: string;
  /** Wadah utama: sumber (EXPENSE/TRANSFER) atau tujuan (INCOME). */
  categoryId: string;
  /** Unit pencatatan opsional. */
  subcategoryId: string | null;
  /** Wadah tujuan khusus TRANSFER. */
  toCategoryId: string | null;
  /** Aturan berulang pembuat transaksi ini (null = manual). */
  recurringId: string | null;
  /** true = pengeluaran dipaksa melewati proteksi tabungan (konfirmasi
   *  "terpaksa" di menu Budget) — riwayat pelanggaran per siklus (D5). */
  forced: boolean;
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

/** Ringkasan Budget per siklus (menu Keuangan > Budget). */
export interface BudgetOverview {
  /**
   * Total tabungan yang dilindungi untuk siklus ini (dasar + sisa dompet
   * yang dipindahkan). Nilainya DINAMIS PER SIKLUS — siklus baru = 0.
   */
  protectedSavings: number;
  /** Nilai dasar tabungan dilindungi yang diisi user untuk siklus ini. */
  protectedSavingsBase: number;
  /** Bagian dari sisa saldo dompet yang dipindahkan ke tabungan dilindungi. */
  protectedSavingsLeftover: number;
  /** Saldo awal siklus. */
  savingsInitial: number;
  /** Total pemasukan siklus. */
  totalIncome: number;
  /** Total pengeluaran siklus. */
  totalSpent: number;
  /** Bisa dialokasikan = saldo awal + pemasukan - tabungan dilindungi. */
  allocatable: number;
  /** Sisa alokasi = bisa dialokasikan - pengeluaran (bisa minus). */
  remaining: number;
  /** true bila pengeluaran sudah menyentuh/melebihi batas alokasi. */
  overProtected: boolean;
  /** Jumlah transaksi yang dipaksa melewati proteksi tabungan di siklus
   *  ini (riwayat pelanggaran — rekomendasi D5). */
  forcedCount: number;
  /** true bila hari terakhir siklus sudah tercapai (nilai sudah dikunci). */
  settled: boolean;
  /** true bila sisa dompet sudah dipindahkan (dompet hanya boleh pemasukan). */
  walletLocked: boolean;
  /** Sisa saldo seluruh dompet siklus ini (pemasukan − pengeluaran). */
  leftover: number;
  /** true bila sisa dompet bisa dipindahkan ke tabungan dilindungi. */
  canApplyLeftover: boolean;
}

/** Target tabungan user (menu Keuangan > Target). */
export interface SavingsTarget {
  id: string;
  name: string;
  /** Nilai target (rupiah). */
  targetAmount: number;
  /**
   * Dana terkumpul — dihitung otomatis dari tabungan bersih seluruh
   * siklus pada wadah terpilih (pemasukan + transfer masuk − pengeluaran
   * − transfer keluar), tidak lagi ditambah manual.
   */
  saved: number;
  /** Wadah sumber dana: kosong = semua wadah; berisi = wadah terpilih. */
  categoryIds: string[];
  /** ISO date batas waktu (opsional). */
  deadline: string | null;
  note: string;
}

/** Aturan transaksi berulang (per bulan, tanggal tertentu). */
export interface RecurringRule {
  id: string;
  type: TransactionType;
  name: string;
  amount: number;
  /** Tanggal jalur bulanan (1-31). */
  dayOfMonth: number;
  categoryId: string;
  subcategoryId: string | null;
  note: string;
  active: boolean;
}

/**
 * Tipe data UI (client-facing) untuk Savings Goal Tracker.
 * Nilai nominal disimpan sebagai `number` (bukan Decimal Prisma) agar
 * aman dilewatkan melewati boundary Server -> Client Component.
 */

/** Satu setoran untuk sebuah goal. */
export interface Contribution {
  id: string;
  goalId: string;
  /** Nominal setoran (rupiah). */
  amount: number;
  /** Catatan bebas. */
  note: string;
  /** ISO datetime setoran. */
  date: string;
}

/** Satu target tabungan beserta setoran & metrik turunan. */
export interface SavingsGoal {
  id: string;
  name: string;
  /** Nominal target (rupiah). */
  targetAmount: number;
  /** Total terkumpul = jumlah semua contribution. */
  currentAmount: number;
  /** Warna aksen (hex). */
  color: string;
  /** ISO datetime deadline, atau null bila tidak ada. */
  deadline: string | null;
  /** Persentase 0-100 (currentAmount / targetAmount). */
  progress: number;
  /** Daftar setoran (terbaru di depan). */
  contributions: Contribution[];
  /** ISO datetime pembuatan. */
  createdAt: string;
}

/** Input untuk membuat/memperbarui goal (tanpa id & turunan). */
export interface SavingsGoalInput {
  name: string;
  targetAmount: number;
  deadline: string | null;
  color: string;
}

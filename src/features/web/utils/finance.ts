/**
 * Utilitas domain Keuangan (client-safe — tanpa import server).
 */

/**
 * Kode error proteksi tabungan (menu Budget). Server melempar error dengan
 * format `SAVINGS_PROTECTION|<batasAlokasi>|<proyeksiPengeluaran>`; client
 * mem-parsing-nya untuk menawarkan konfirmasi "terpaksa".
 */
export const SAVINGS_PROTECTION_CODE = "SAVINGS_PROTECTION";

/** Hasil parsing error proteksi tabungan. */
export interface SavingsProtectionInfo {
  /** Batas alokasi siklus (pengeluaran maksimum tanpa menyentuh tabungan). */
  limit: number;
  /** Proyeksi total pengeluaran bila transaksi disimpan. */
  projected: number;
}

/** Parse pesan error proteksi tabungan; null bila bukan error tersebut. */
export function parseSavingsProtectionError(
  message: string,
): SavingsProtectionInfo | null {
  if (!message.startsWith(SAVINGS_PROTECTION_CODE + "|")) return null;
  const [, limit, projected] = message.split("|");
  const limitNum = Number(limit);
  const projectedNum = Number(projected);
  if (!Number.isFinite(limitNum) || !Number.isFinite(projectedNum)) {
    return null;
  }
  return { limit: limitNum, projected: projectedNum };
}

/** Banyak hari dalam sebuah bulan (month 0-based). */
export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Clamp tanggal jalur bulanan (1-31) ke jumlah hari bulan tersebut. */
export function clampDayOfMonth(
  dayOfMonth: number,
  year: number,
  monthIndex: number,
): number {
  return Math.min(Math.max(1, dayOfMonth), daysInMonth(year, monthIndex));
}

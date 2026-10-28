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

/**
 * Kode error batas alokasi wadah (insight DROID.md): dana tersedia wadah
 * = alokasi + pemasukan + transfer masuk − pengeluaran − transfer keluar.
 * Pengeluaran/transfer keluar tidak boleh melebihi dana tersedia. Server
 * melempar error berformat `WALLET_LIMIT|<namaWadah>|<danaTersedia>|<proyeksiKeluar>`;
 * client mem-parsing-nya untuk menampilkan pesan (batas wadah TIDAK bisa
 * dilewati — beda dengan proteksi tabungan yang bisa dipaksa).
 */
export const WALLET_LIMIT_CODE = "WALLET_LIMIT";

/** Hasil parsing error batas wadah. */
export interface WalletLimitInfo {
  /** Nama wadah yang dananya tidak cukup. */
  walletName: string;
  /** Dana tersedia wadah (alokasi + masuk − keluar) per siklus. */
  limit: number;
  /** Proyeksi total dana keluar wadah bila transaksi disimpan. */
  projected: number;
}

/** Parse pesan error batas wadah; null bila bukan error tersebut. */
export function parseWalletLimitError(message: string): WalletLimitInfo | null {
  if (!message.startsWith(WALLET_LIMIT_CODE + "|")) return null;
  const [, walletName, limit, projected] = message.split("|");
  const limitNum = Number(limit);
  const projectedNum = Number(projected);
  if (!Number.isFinite(limitNum) || !Number.isFinite(projectedNum)) {
    return null;
  }
  return { walletName, limit: limitNum, projected: projectedNum };
}

/**
 * Kode error siklus terkunci (DROID.md — Budget): setelah sisa saldo
 * seluruh dompet dipindahkan ke tabungan dilindungi, dompet pada siklus
 * itu hanya boleh menerima pemasukan. Server melempar error berformat
 * `WALLET_LOCKED|<pesan>`; batas ini TIDAK bisa dilewati (tanpa paksa).
 */
export const WALLET_LOCKED_CODE = "WALLET_LOCKED";

/** true bila pesan error adalah penolakan karena siklus sudah terkunci. */
export function isWalletLockedError(message: string): boolean {
  return message.startsWith(WALLET_LOCKED_CODE + "|");
}

/** Pesan penolakan siklus terkunci (tanpa kode), atau null. */
export function parseWalletLockedError(message: string): string | null {
  if (!isWalletLockedError(message)) return null;
  return message.split("|").slice(1).join("|");
}

/** Banyak hari dalam sebuah bulan (month 0-based; basis hari kanonik UTC). */
export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Clamp tanggal jalur bulanan (1-31) ke jumlah hari bulan tersebut. */
export function clampDayOfMonth(
  dayOfMonth: number,
  year: number,
  monthIndex: number,
): number {
  return Math.min(Math.max(1, dayOfMonth), daysInMonth(year, monthIndex));
}

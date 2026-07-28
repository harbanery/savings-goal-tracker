import { CYCLE_START_DAY } from "@/config/variables";

/**
 * Utilitas siklus bulanan (billing cycle).
 * Siklus dimulai tanggal 25 setiap bulan.
 *
 * Contoh siklus "Agustus": 25 Juli s/d 24 Agustus.
 * Jika hari ini 25 Juli atau setelahnya (sampai 24 Agustus),
 * maka pembelian masuk ke siklus Agustus.
 *
 * Aturan: sebuah tanggal masuk ke siklus bulan BERIKUTNYA jika
 * tanggalnya >= 25, atau siklus bulan INI jika < 25.
 */

export interface CycleInfo {
  /** Tahun siklus (tahun bulan akhir siklus). */
  year: number;
  /** Index bulan akhir siklus (0-based). */
  monthIndex: number;
  /** Tanggal mulai siklus (tanggal 25 bulan sebelumnya). */
  startDate: Date;
  /** Tanggal akhir siklus (tanggal 24 bulan ini). */
  endDate: Date;
  /** Label tampilan, mis. "Agustus 2026". */
  label: string;
}

const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/**
 * Tentukan info siklus untuk tahun dan index bulan tertentu.
 * @param year tahun bulan AKHIR siklus
 * @param monthIndex index bulan akhir siklus (0-based)
 */
export function getCycleInfo(year: number, monthIndex: number): CycleInfo {
  // Start: tanggal 25 bulan sebelumnya
  const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
  const prevYear = monthIndex === 0 ? year - 1 : year;
  const startDate = new Date(prevYear, prevMonth, CYCLE_START_DAY, 0, 0, 0, 0);

  // End: tanggal 24 bulan ini (akhir hari)
  const endDate = new Date(year, monthIndex, 24, 23, 59, 59, 999);

  const label = `${MONTH_NAMES_ID[monthIndex]} ${year}`;

  return { year, monthIndex, startDate, endDate, label };
}

/**
 * Tentukan siklus untuk sebuah tanggal.
 * Jika tanggal >= 25: masuk siklus bulan berikutnya.
 * Jika tanggal < 25: masuk siklus bulan ini.
 */
export function getCycleForDate(date: Date): CycleInfo {
  const day = date.getDate();
  if (day >= CYCLE_START_DAY) {
    // Masuk siklus bulan depan
    const nextMonth = date.getMonth() === 11 ? 0 : date.getMonth() + 1;
    const nextYear = date.getMonth() === 11 ? date.getFullYear() + 1 : date.getFullYear();
    return getCycleInfo(nextYear, nextMonth);
  }
  // Masuk siklus bulan ini
  return getCycleInfo(date.getFullYear(), date.getMonth());
}

/** Siklus saat ini berdasarkan tanggal hari ini. */
export function getCurrentCycle(): CycleInfo {
  return getCycleForDate(new Date());
}

/** Geser siklus sebanyak n bulan (positif = maju, negatif = mundur). */
export function shiftCycle(cycle: CycleInfo, deltaMonths: number): CycleInfo {
  const totalMonths = cycle.year * 12 + cycle.monthIndex + deltaMonths;
  const year = Math.floor(totalMonths / 12);
  const monthIndex = ((totalMonths % 12) + 12) % 12;
  return getCycleInfo(year, monthIndex);
}

/** Apakah sebuah tanggal berada dalam rentang siklus? */
export function isDateInCycle(date: Date, cycle: CycleInfo): boolean {
  const d = new Date(date);
  return d >= cycle.startDate && d <= cycle.endDate;
}

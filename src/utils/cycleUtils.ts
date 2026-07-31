import { CYCLE_START_DAY } from "@/config/variables";
import type { Locale } from "@/models/types";

/**
 * Utilitas siklus bulanan (billing cycle).
 * Siklus dimulai pada tanggal tertentu setiap bulan (default hari 25).
 *
 * Contoh dengan startDay = 25, siklus "Agustus": 25 Juli s/d 24 Agustus.
 * Aturan: sebuah tanggal masuk ke siklus bulan BERIKUTNYA jika
 * tanggalnya >= startDay, atau siklus bulan INI jika < startDay.
 */

/** Rentang tanggal mulai siklus yang diperbolehkan. */
export const MIN_CYCLE_START_DAY = 1;
export const MAX_CYCLE_START_DAY = 28;

/** Validasi rentang tanggal mulai siklus (1-28). */
export function isValidCycleStartDay(day: number): boolean {
  return (
    Number.isInteger(day) && day >= MIN_CYCLE_START_DAY && day <= MAX_CYCLE_START_DAY
  );
}

export interface CycleInfo {
  /** Tahun siklus (tahun bulan akhir siklus). */
  year: number;
  /** Index bulan akhir siklus (0-based). */
  monthIndex: number;
  /** Tanggal mulai siklus (startDay bulan sebelumnya). */
  startDate: Date;
  /** Tanggal akhir siklus (startDay - 1 bulan ini). */
  endDate: Date;
  /** Kunci netral locale, mis. "2026-08". Stabil sebagai key data. */
  key: string;
  /** Label tampilan default (locale id), mis. "Agustus 2026". */
  label: string;
}

const MONTH_NAMES: Record<Locale, string[]> = {
  id: [
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
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
};

/** Kunci netral locale untuk sebuah tahun & index bulan, mis. "2026-08". */
export function getCycleKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

/** Label tampilan siklus sesuai locale, mis. "Agustus 2026" / "August 2026". */
export function formatCycleLabel(
  year: number,
  monthIndex: number,
  locale: Locale,
): string {
  const names = MONTH_NAMES[locale] ?? MONTH_NAMES.id;
  return `${names[monthIndex]} ${year}`;
}

/**
 * Tentukan info siklus untuk tahun dan index bulan tertentu.
 * @param year tahun bulan AKHIR siklus
 * @param monthIndex index bulan akhir siklus (0-based)
 * @param startDay tanggal mulai siklus tiap bulan (default dari config)
 */
export function getCycleInfo(
  year: number,
  monthIndex: number,
  startDay: number = CYCLE_START_DAY,
): CycleInfo {
  const day = isValidCycleStartDay(startDay) ? startDay : CYCLE_START_DAY;

  // Start: tanggal startDay bulan sebelumnya
  const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
  const prevYear = monthIndex === 0 ? year - 1 : year;
  const startDate = new Date(prevYear, prevMonth, day, 0, 0, 0, 0);

  // End: tanggal (startDay - 1) bulan ini (akhir hari).
  // Jika startDay = 1, end = hari terakhir bulan sebelumnya (bukan 0 yang overflow).
  const endDate =
    day === 1
      ? new Date(year, monthIndex, 0, 23, 59, 59, 999)
      : new Date(year, monthIndex, day - 1, 23, 59, 59, 999);

  const key = getCycleKey(year, monthIndex);
  const label = formatCycleLabel(year, monthIndex, "id");

  return { year, monthIndex, startDate, endDate, key, label };
}

/**
 * Tentukan siklus untuk sebuah tanggal.
 * Jika tanggal >= startDay: masuk siklus bulan berikutnya.
 * Jika tanggal < startDay: masuk siklus bulan ini.
 */
export function getCycleForDate(
  date: Date,
  startDay: number = CYCLE_START_DAY,
): CycleInfo {
  const day = date.getDate();
  if (day >= startDay) {
    // Masuk siklus bulan depan
    const nextMonth = date.getMonth() === 11 ? 0 : date.getMonth() + 1;
    const nextYear = date.getMonth() === 11 ? date.getFullYear() + 1 : date.getFullYear();
    return getCycleInfo(nextYear, nextMonth, startDay);
  }
  // Masuk siklus bulan ini
  return getCycleInfo(date.getFullYear(), date.getMonth(), startDay);
}

/** Siklus saat ini berdasarkan tanggal hari ini. */
export function getCurrentCycle(startDay?: number): CycleInfo {
  return getCycleForDate(new Date(), startDay);
}

/** Geser siklus sebanyak n bulan (positif = maju, negatif = mundur). */
export function shiftCycle(
  cycle: CycleInfo,
  deltaMonths: number,
  startDay: number = CYCLE_START_DAY,
): CycleInfo {
  const totalMonths = cycle.year * 12 + cycle.monthIndex + deltaMonths;
  const year = Math.floor(totalMonths / 12);
  const monthIndex = ((totalMonths % 12) + 12) % 12;
  return getCycleInfo(year, monthIndex, startDay);
}

/** Apakah sebuah tanggal berada dalam rentang siklus? */
export function isDateInCycle(date: Date, cycle: CycleInfo): boolean {
  const d = new Date(date);
  return d >= cycle.startDate && d <= cycle.endDate;
}

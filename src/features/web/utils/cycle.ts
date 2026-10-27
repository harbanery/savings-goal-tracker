import { DEFAULT_CYCLE_START_DAY } from "@/utils/config/variables";
import type { Locale } from "@/types/locale";

/**
 * Utilitas siklus bulanan (billing cycle).
 * Siklus dimulai pada tanggal tertentu setiap bulan (default hari 25).
 *
 * Contoh dengan startDay = 25, siklus "Agustus": 25 Juli s/d 24 Agustus.
 * Aturan: sebuah tanggal masuk ke siklus bulan BERIKUTNYA jika
 * tanggalnya >= startDay, atau siklus bulan INI jika < startDay.
 *
 * BASIS HARI KANONIK (UTC midnight): seluruh logika level-hari (batas
 * siklus, kemunculan transaksi berulang) memakai tengah malam UTC sebagai
 * hari kalender yang sama di server (apa pun timezone-nya) dan di klien.
 * Sebelumnya batas siklus dibangun dengan konstruktor lokal sehingga
 * server UTC (produksi) membaca tanggal setempat yang berbeda dari yang
 * dipilih user — transaksi berulang di tanggal mulai siklus bisa nyasar
 * ke siklus sebelumnya. Getter/ konstruktor UTC menjamin konsistensi.
 */

/** Durasi satu hari dalam milidetik. */
export const DAY_MS = 86_400_000;

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
  /** Tanggal mulai siklus (startDay bulan sebelumnya, tengah malam UTC). */
  startDate: Date;
  /** Tanggal akhir siklus (startDay - 1 bulan ini, 23:59:59.999 UTC). */
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
 * Normalisasi instan apa pun ke hari kanoniknya (tengah malam UTC).
 * Dipakai untuk tanggal tersimpan (selalu tengah malam UTC) dan untuk
 * membandingkan hari pada level hari.
 */
export function toDayUTC(date: Date): Date {
  return new Date(Math.floor(date.getTime() / DAY_MS) * DAY_MS);
}

/**
 * Hari kalender LOKAL mesin yang menjalankan kode sebagai hari kanonik
 * (tengah malam UTC). Di klien = "hari ini" versi user; di server
 * produksi (UTC) = hari UTC. Konsisten dengan persepsi user di UI.
 */
export function localDayStart(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

/**
 * Tentukan info siklus untuk tahun dan index bulan tertentu.
 * Batas siklus dibangun dengan Date.UTC agar identik di server & klien.
 * @param year tahun bulan AKHIR siklus
 * @param monthIndex index bulan akhir siklus (0-based)
 * @param startDay tanggal mulai siklus tiap bulan (default dari config)
 */
export function getCycleInfo(
  year: number,
  monthIndex: number,
  startDay: number = DEFAULT_CYCLE_START_DAY,
): CycleInfo {
  const day = isValidCycleStartDay(startDay) ? startDay : DEFAULT_CYCLE_START_DAY;

  // Start: tanggal startDay bulan sebelumnya (tengah malam UTC).
  const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
  const prevYear = monthIndex === 0 ? year - 1 : year;
  const startDate = new Date(Date.UTC(prevYear, prevMonth, day));

  // End: tanggal (startDay - 1) bulan ini hingga akhir hari (UTC).
  // Jika startDay = 1, end = hari terakhir bulan sebelumnya (bukan 0 yang overflow).
  const endDayMs =
    day === 1
      ? Date.UTC(year, monthIndex, 0)
      : Date.UTC(year, monthIndex, day - 1);
  const endDate = new Date(endDayMs + DAY_MS - 1);

  const key = getCycleKey(year, monthIndex);
  const label = formatCycleLabel(year, monthIndex, "id");

  return { year, monthIndex, startDate, endDate, key, label };
}

/**
 * Tentukan siklus untuk sebuah tanggal (hari kanonik UTC).
 * Jika tanggal >= startDay: masuk siklus bulan berikutnya.
 * Jika tanggal < startDay: masuk siklus bulan ini.
 */
export function getCycleForDate(
  date: Date,
  startDay: number = DEFAULT_CYCLE_START_DAY,
): CycleInfo {
  const day = date.getUTCDate();
  if (day >= startDay) {
    // Masuk siklus bulan depan
    const nextMonth = date.getUTCMonth() === 11 ? 0 : date.getUTCMonth() + 1;
    const nextYear =
      date.getUTCMonth() === 11 ? date.getUTCFullYear() + 1 : date.getUTCFullYear();
    return getCycleInfo(nextYear, nextMonth, startDay);
  }
  // Masuk siklus bulan ini
  return getCycleInfo(date.getUTCFullYear(), date.getUTCMonth(), startDay);
}

/** Siklus saat ini berdasarkan hari kalender lokal mesin (klien: hari user). */
export function getCurrentCycle(startDay?: number): CycleInfo {
  return getCycleForDate(localDayStart(new Date()), startDay);
}

/** Geser siklus sebanyak n bulan (positif = maju, negatif = mundur). */
export function shiftCycle(
  cycle: CycleInfo,
  deltaMonths: number,
  startDay: number = DEFAULT_CYCLE_START_DAY,
): CycleInfo {
  const totalMonths = cycle.year * 12 + cycle.monthIndex + deltaMonths;
  const year = Math.floor(totalMonths / 12);
  const monthIndex = ((totalMonths % 12) + 12) % 12;
  return getCycleInfo(year, monthIndex, startDay);
}

/** Apakah sebuah tanggal berada dalam rentang siklus? (level instan) */
export function isDateInCycle(date: Date, cycle: CycleInfo): boolean {
  const d = new Date(date);
  return d >= cycle.startDate && d <= cycle.endDate;
}

/** Bandingkan dua tanggal pada level hari kanonik (abaikan jam). */
export function isSameDay(a: Date, b: Date): boolean {
  return toDayUTC(a).getTime() === toDayUTC(b).getTime();
}

/** Apakah `date` adalah hari pertama sebuah siklus (tanggal = startDay)? */
export function isCycleStartDay(
  date: Date = new Date(),
  startDay: number = DEFAULT_CYCLE_START_DAY,
): boolean {
  const day = toDayUTC(date);
  return day.getTime() === getCycleForDate(day, startDay).startDate.getTime();
}

/** Apakah `date` adalah hari terakhir sebuah siklus (tanggal = startDay - 1)? */
export function isCycleLastDay(
  date: Date = new Date(),
  startDay: number = DEFAULT_CYCLE_START_DAY,
): boolean {
  const day = toDayUTC(date);
  return day.getTime() === getCycleForDate(day, startDay).endDate.getTime();
}

/** Format tanggal panjang sesuai locale, mis. "24 Agustus 2026" / "24 August 2026". */
export function formatDateLabel(date: Date, locale: Locale = "id"): string {
  const names = MONTH_NAMES[locale] ?? MONTH_NAMES.id;
  return `${date.getUTCDate()} ${names[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

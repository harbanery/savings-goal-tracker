/**
 * Date utilities untuk dashboard savings tracker.
 */

/** Format Date ke ISO date string (YYYY-MM-DD) menggunakan komponen lokal. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Label hari singkat (Min, Sen, Sel, ...). */
export function getWeekdayLabel(d: Date): string {
  return ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][d.getDay()];
}

/** Nama bulan dalam Bahasa Indonesia. */
export function getMonthLabel(monthIndex: number): string {
  return [
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
  ][monthIndex];
}

/** Hitung selisih hari antara dua tanggal (target - from), bisa negatif. */
export function daysBetween(from: Date, target: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/** Sisa hari menuju deadline relatif terhadap hari ini. Bisa negatif (lewat). */
export function daysUntilDeadline(deadlineISO: string | null): number | null {
  if (!deadlineISO) return null;
  const target = new Date(deadlineISO);
  if (Number.isNaN(target.getTime())) return null;
  return daysBetween(new Date(), target);
}

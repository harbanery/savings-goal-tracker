/**
 * Date utilities untuk budget tracker.
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

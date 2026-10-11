import type { Metadata } from "next";
import type { Locale } from "@/types/locale";
import {
  DEFAULT_LOCALE,
  TRANSLATIONS,
} from "@/components/i18n/translations";

/**
 * Utilitas format mata uang Rupiah (IDR) + tanggal (fungsi murni global).
 * Locale "id" -> prefix "Rp" dengan pemisah "." (mis. "Rp 1.500.000").
 * Locale "en" -> prefix "IDR" dengan pemisah "," (mis. "IDR 1,500,000").
 */

type CurrencyLocale = Locale;

const BCP47: Record<CurrencyLocale, string> = {
  id: "id-ID",
  en: "en-US",
};

/** Simbol ringkas per locale untuk formatShortIDR. */
const SHORT_SYMBOL: Record<CurrencyLocale, string> = {
  id: "Rp",
  en: "IDR",
};

/** Label satuan per locale untuk nominal besar, mis. jt/M. */
const SHORT_UNIT: Record<CurrencyLocale, { b: string; m: string; k: string }> = {
  id: { b: "M", m: "jt", k: "rb" },
  en: { b: "B", m: "M", k: "K" },
};

/** Karakter pemisah desimal per locale. */
const DECIMAL_SEP: Record<CurrencyLocale, string> = {
  id: ",",
  en: ".",
};

/**
 * Format angka ke string Rupiah sesuai locale.
 * mis. 1500000 -> "Rp 1.500.000" (id) / "IDR 1,500,000" (en).
 */
export function formatIDR(amount: number, locale: CurrencyLocale = "id"): string {
  return new Intl.NumberFormat(BCP47[locale], {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format angka dengan pemisah ribuan, mis. 1500000 -> "1.500.000" (id). */
export function formatNumber(amount: number, locale: CurrencyLocale = "id"): string {
  return new Intl.NumberFormat(BCP47[locale]).format(amount);
}

/**
 * Format ringkas untuk nominal besar, mis. 1500000 -> "Rp 1,5 jt" (id) / "IDR 1.5M" (en).
 */
export function formatShortIDR(
  amount: number,
  locale: CurrencyLocale = "id",
): string {
  const abs = Math.abs(amount);
  const symbol = SHORT_SYMBOL[locale];
  const unit = SHORT_UNIT[locale];
  const sep = DECIMAL_SEP[locale];
  if (abs >= 1_000_000_000)
    return `${symbol} ${(amount / 1_000_000_000).toFixed(1).replace(".", sep)} ${unit.b}`;
  if (abs >= 1_000_000)
    return `${symbol} ${(amount / 1_000_000).toFixed(1).replace(".", sep)} ${unit.m}`;
  if (abs >= 1_000)
    return `${symbol} ${Math.round(amount / 1_000)} ${unit.k}`;
  return formatIDR(amount, locale);
}

// ---------------------------------------------------------------------------
// Date helpers (locale-aware)
// ---------------------------------------------------------------------------

/** Nama bulan panjang per locale. */
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

/** Label hari singkat per locale (Min, Sen, Sel, ... / Sun, Mon, Tue, ...). */
const WEEKDAY_LABELS: Record<Locale, string[]> = {
  id: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

/** Format Date ke ISO date string (YYYY-MM-DD) menggunakan komponen lokal. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Label hari singkat sesuai locale (Min, Sen, ... / Sun, Mon, ...). */
export function getWeekdayLabel(d: Date, locale: Locale = "id"): string {
  return WEEKDAY_LABELS[locale][d.getDay()];
}

/** Nama bulan panjang sesuai locale (Januari / January). */
export function getMonthLabel(monthIndex: number, locale: Locale = "id"): string {
  return MONTH_NAMES[locale][monthIndex];
}

// ---------------------------------------------------------------------------
// Page metadata helper (server-side <head>)
// ---------------------------------------------------------------------------

/**
 * Bangun metadata halaman dari key translate (title + description opsional).
 * Selalu memakai DEFAULT_LOCALE karena metadata dievaluasi server-side
 * sebelum hidrasi (locale aktif user tersimpan di localStorage, tidak
 * terbaca server) — konsisten dengan SSR yang merender "id" sebagai
 * default. Title halaman otomatis digabung template root layout
 * ("%s | Savings Goal Tracker").
 */
export function buildPageMetadata(
  titleKey: string,
  descriptionKey?: string,
): Metadata {
  const dict = TRANSLATIONS[DEFAULT_LOCALE];
  const title = dict[titleKey] ?? titleKey;
  const description = descriptionKey ? dict[descriptionKey] : undefined;
  return { title, ...(description && { description }) };
}


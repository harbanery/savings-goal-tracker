import type { Locale } from "@/models/types";

/**
 * Utilitas format mata uang Rupiah (IDR).
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

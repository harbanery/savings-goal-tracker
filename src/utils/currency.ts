/**
 * Utilitas format mata uang Rupiah (IDR).
 */

/** Format angka ke string Rupiah, mis. 1500000 -> "Rp 1.500.000". */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format angka dengan pemisah ribuan (id-ID), mis. 1500000 -> "1.500.000". */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("id-ID").format(amount);
}

/** Format ringkas untuk nominal besar, mis. 1500000 -> "Rp 1,5 jt". */
export function formatShortIDR(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)} M`;
  if (abs >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)} jt`;
  if (abs >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)} rb`;
  return formatIDR(amount);
}

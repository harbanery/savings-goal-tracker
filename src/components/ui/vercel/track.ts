"use client";

import { track } from "@vercel/analytics";

/**
 * Nama custom event Vercel Analytics (rekomendasi C1 — P2).
 * Union terbatas agar penamaan konsisten di seluruh aplikasi dan mudah
 * dicari di dashboard Vercel (Events).
 */
export type AnalyticsEvent =
  // Auth
  | "login_google_clicked"
  // Transaksi
  | "transaction_created"
  | "transaction_updated"
  // CSV
  | "csv_imported"
  | "csv_exported"
  | "csv_template_downloaded"
  // Preferensi pengguna
  | "locale_changed"
  | "theme_toggled"
  | "push_subscribed"
  | "push_unsubscribed"
  // PWA
  | "pwa_install_accepted"
  | "pwa_install_dismissed";

/**
 * Kirim custom event ke Vercel Analytics.
 *
 * - No-op di server: guard `window` agar aman dipanggil dari komponen
 *   universal / render awal (event nyata hanya terkait setelah hidrasi).
 * - Jangan mengirim data pribadi/finansial (nominal, nama transaksi);
 *   properti yang diizinkan hanya string/number/boolean/null.
 */
export function trackEvent(
  name: AnalyticsEvent,
  properties?: Record<
    string,
    string | number | boolean | null | undefined
  >,
): void {
  if (typeof window === "undefined") return;
  track(name, properties);
}

/**
 * Tipe global lintas-layer (dipakai components/i18n, utils, dan features).
 * Ditempatkan di src/types sesuai blueprint: hanya interface yang
 * digunakan lintas feature yang boleh jadi tipe global.
 */

/** Locale yang didukung aplikasi. */
export type Locale = "id" | "en";

/** Teks yang tersedia dalam kedua bahasa. */
export type LocaleText = { id: string; en: string };

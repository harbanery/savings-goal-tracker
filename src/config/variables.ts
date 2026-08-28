export const META_TITLE: string =
  process.env.TITLE_WEB ?? "Savings Goal Tracker";
export const META_APP: string = process.env.APP_WEB ?? "Savings Goal Tracker";
export const META_DESCRIPTION: string | undefined =
  process.env.DESCRIPTION_WEB ??
  "Pantau target tabungan dan progres menabung Anda.";

export const BASE_URL: string =
  process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";

export const DATABASE_URL: string = process.env.DATABASE_URL ?? "";

/**
 * Mode mockup publik (demo). Nilai disuntikkan oleh next.config.ts
 * berdasarkan keberadaan DATABASE_URL saat build, sehingga aman
 * dikonsumsi komponen client maupun server.
 * - true  : DATABASE_URL kosong -> data hanya di memori (hilang saat reload).
 * - false : DATABASE_URL terisi -> flow database normal.
 */
export const IS_DEMO: boolean = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const NODE_ENV: string = process.env.NODE_ENV || "development";

/** Saldo awal setiap siklus bulanan (top-up tanggal 25). */
export const SAVINGS_INITIAL: number = Number(
  process.env.NEXT_PUBLIC_SAVINGS_INITIAL ?? "0",
);

/** Tanggal mulai siklus (tanggal 25 tiap bulan). */
export const CYCLE_START_DAY: number = 25;

// Web Push (VAPID keys untuk push notifications)
export const VAPID_PUBLIC_KEY: string =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
export const VAPID_PRIVATE_KEY: string = process.env.VAPID_PRIVATE_KEY || "";
export const VAPID_SUBJECT: string =
  process.env.VAPID_SUBJECT || "mailto:noreply@savings-goal-tracker.local";

// Vercel Cron secret (untuk autentikasi cron job endpoints)
export const CRON_SECRET: string = process.env.CRON_SECRET || "";

// Email (Nodemailer SMTP) - channel notifikasi tambahan selain web push.
// Bila SMTP_HOST kosong, channel email otomatis dilewati (no-op).
export const SMTP_HOST: string = process.env.SMTP_HOST || "";
export const SMTP_PORT: number = Number(process.env.SMTP_PORT || "465");
/** Secure (TLS langsung) bila port 465. STARTTLS untuk port lain (587). */
const SMTP_SECURE_RAW = process.env.SMTP_SECURE ?? "";
export const SMTP_SECURE: boolean =
  SMTP_SECURE_RAW === "" ? SMTP_PORT === 465 : SMTP_SECURE_RAW === "true";
export const SMTP_USER: string = process.env.SMTP_USER || "";
export const SMTP_PASS: string = process.env.SMTP_PASS || "";
/** Alamat pengirim. Jika kosong, pakai SMTP_USER. */
export const SMTP_FROM: string = process.env.SMTP_FROM || SMTP_USER;
/** Alamat penerima notifikasi (single-user app). */
export const NOTIFICATION_EMAIL_TO: string =
  process.env.NOTIFICATION_EMAIL_TO || "";

// Bahasa konten notifikasi server-side (id | en). Default "id".
export type NotificationLocale = "id" | "en";
export const NOTIFICATION_LOCALE: NotificationLocale =
  process.env.NOTIFICATION_LOCALE === "en" ? "en" : "id";

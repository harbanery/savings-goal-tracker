export const META_TITLE: string =
  process.env.TITLE_WEB ?? "Savings Goal Tracker";
export const META_APP: string = process.env.APP_WEB ?? "Savings Goal Tracker";
export const META_DESCRIPTION: string | undefined =
  process.env.DESCRIPTION_WEB ??
  "Pantau target tabungan dan progres menabung Anda.";

export const BASE_URL: string =
  process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";

export const DATABASE_URL: string = process.env.DATABASE_URL ?? "";

export const NODE_ENV: string = process.env.NODE_ENV || "development";

// ---------------------------------------------------------------------------
// Google OAuth (Google Cloud Console — Web application)
// Authorized redirect URI: ${BASE_URL}/api/web/auth/google/callback
// ---------------------------------------------------------------------------
export const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID || "";
export const GOOGLE_CLIENT_SECRET: string =
  process.env.GOOGLE_CLIENT_SECRET || "";
export const GOOGLE_REDIRECT_URI: string =
  process.env.GOOGLE_REDIRECT_URI ||
  `${BASE_URL}/api/web/auth/google/callback`;
/** Google SSO aktif hanya bila client id + secret terisi. */
export const GOOGLE_IS_CONFIGURED: boolean =
  GOOGLE_CLIENT_ID !== "" && GOOGLE_CLIENT_SECRET !== "";

// ---------------------------------------------------------------------------
// Session (custom opaque token, disimpan sha256-hash di DB — ala tourism-village)
// ---------------------------------------------------------------------------
export const SESSION_COOKIE = "sgt_session";
export const OAUTH_STATE_COOKIE = "sgt_oauth_state";
/**
 * Cookie tema (light/dark). localStorage tidak bisa dibaca server, jadi
 * tema juga dipersist ke cookie agar SSR antd menghasilkan style tema
 * yang benar (tidak ada flash putih saat dark mode).
 */
export const THEME_COOKIE = "sgt_theme";
/**
 * Cookie locale (id/en). localStorage tetap sumber kebenaran di klien;
 * cookie dibaca SSR root layout agar atribut <html lang> langsung benar
 * (screen reader tidak membaca bahasa yang salah sebelum hidrasi).
 */
export const LOCALE_COOKIE = "sgt_locale";
/** Masa berlaku sesi login (jam). */
export const SESSION_TTL_HOURS = 720; // 30 hari — login awet untuk app harian
export const MAX_SESSIONS_PER_USER = 5;

// ---------------------------------------------------------------------------
// Default data user baru (dipakai saat register Google pertama kali)
// ---------------------------------------------------------------------------
/**
 * Saldo awal user baru SELALU 0 (DROID.md: NEXT_PUBLIC_SAVINGS_INITIAL sudah
 * dihapus — saldo tumbuh murni dari transaksi yang dicatat). Kolom
 * `savings_initial` di DB tetap ada (default 0) demi kompatibilitas data.
 */
/** Tanggal mulai siklus default (1-28) untuk user baru. */
export const DEFAULT_CYCLE_START_DAY = 25;

/**
 * Kuota pendaftaran akun (DROID.md: aplikasi pribadi — maksimal 5 user).
 * Login Google dari akun baru ditolak bila kuota sudah tercapai; akun
 * yang sudah terdaftar tetap bisa login.
 */
export const MAX_REGISTERED_USERS = 5;

// Web Push (VAPID keys untuk push notifications)
export const VAPID_PUBLIC_KEY: string =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
export const VAPID_PRIVATE_KEY: string = process.env.VAPID_PRIVATE_KEY || "";
export const VAPID_SUBJECT: string =
  process.env.VAPID_SUBJECT || "mailto:noreply@savings-goal-tracker.local";

// Vercel Cron secret (untuk autentikasi cron job endpoints)
export const CRON_SECRET: string = process.env.CRON_SECRET || "";

// Email (Nodemailer SMTP) - channel notifikasi tambahan selain web push.
// Penerima email diambil per-user (users.email), bukan env.
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

// Bahasa konten notifikasi server-side (id | en). Default "id".
export type NotificationLocale = "id" | "en";
export const NOTIFICATION_LOCALE: NotificationLocale =
  process.env.NOTIFICATION_LOCALE === "en" ? "en" : "id";

// ---------------------------------------------------------------------------
// WhatsApp bot (Baileys — service BE terpisah, lihat savings-goal-tracker-be)
// ---------------------------------------------------------------------------
/**
 * Shared secret antara service BE (savings-goal-tracker-be) dan FE:
 * dipakai FE untuk memanggil `/api/bot/*` (header `x-internal-secret`).
 * Wajib sama dengan INTERNAL_SECRET di env BE. Jika kosong, pemanggilan
 * ke BE ditolak (fail-closed).
 */
export const WHATSAPP_INTERNAL_SECRET: string =
  process.env.WHATSAPP_INTERNAL_SECRET || "";
/** URL dasar service BE WhatsApp (mis. http://localhost:4000). */
export const WHATSAPP_BOT_API_URL: string =
  (process.env.WHATSAPP_BOT_API_URL || "").replace(/\/+$/, "");
/** Integrasi WhatsApp aktif hanya bila URL BE + secret terisi. */
export const WHATSAPP_IS_CONFIGURED: boolean =
  WHATSAPP_BOT_API_URL !== "" && WHATSAPP_INTERNAL_SECRET !== "";
/** Masa berlaku kode pairing user (menit). */
export const WHATSAPP_PAIRING_TTL_MINUTES = 10;

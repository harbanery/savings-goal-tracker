import nodemailer, { type Transporter } from "nodemailer";
import {
  SMTP_FROM,
  SMTP_HOST,
  SMTP_PASS,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  NOTIFICATION_EMAIL_TO,
} from "@/config/variables";

/**
 * Service pengiriman email via Nodemailer (SMTP).
 *
 * Dipakai sebagai channel tambahan selain web push. Karena ini aplikasi
 * single-user, penerima diambil dari env `NOTIFICATION_EMAIL_TO`.
 * Bila SMTP belum dikonfigurasi (SMTP_HOST kosong), channel ini otomatis
 * diabaikan agar tetap berjalan di environment tanpa email (mis. dev lokal).
 */

let transporter: Transporter | null = null;

/** Apakah channel email aktif (SMTP + penerima sudah dikonfigurasi)? */
export function isEmailConfigured(): boolean {
  return Boolean(SMTP_HOST && SMTP_USER && NOTIFICATION_EMAIL_TO);
}

/** Inisialisasi transporter SMTP sekali (lazy). */
function getTransporter(): Transporter {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_PASS
      ? { user: SMTP_USER, pass: SMTP_PASS }
      : undefined,
  });
  return transporter;
}

interface EmailPayload {
  subject: string;
  /** Versi teks polos (fallback + untuk notifikasi singkat). */
  text: string;
  /** Versi HTML (opsional, jika tidak ada pakai teks polos). */
  html?: string;
}

/**
 * Kirim email notifikasi ke penerima yang dikonfigurasi.
 * Mengembalikan true jika berhasil, false jika gagal atau belum dikonfigurasi.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: NOTIFICATION_EMAIL_TO,
      subject: payload.subject,
      text: payload.text,
      html: payload.html ?? payload.text.replace(/\n/g, "<br>"),
    });
    return true;
  } catch (err) {
    console.error("[email] error sending:", err);
    return false;
  }
}

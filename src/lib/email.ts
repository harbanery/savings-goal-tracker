import nodemailer, { type Transporter } from "nodemailer";
import {
  SMTP_FROM,
  SMTP_HOST,
  SMTP_PASS,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
} from "@/utils/config/variables";

/**
 * Service pengiriman email via Nodemailer (SMTP).
 *
 * Channel tambahan selain web push. Penerima diambil PER-USER
 * (users.email). Bila SMTP belum dikonfigurasi (SMTP_HOST kosong),
 * channel ini otomatis diabaikan.
 */

let transporter: Transporter | null = null;

/** Apakah channel email aktif (SMTP sudah dikonfigurasi)? */
export function isEmailConfigured(): boolean {
  return Boolean(SMTP_HOST && SMTP_USER);
}

/** Inisialisasi transporter SMTP sekali (lazy). */
function getTransporter(): Transporter {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return transporter;
}

interface EmailPayload {
  to: string;
  subject: string;
  /** Versi teks polos (fallback + untuk notifikasi singkat). */
  text: string;
  /** Versi HTML (opsional, jika tidak ada pakai teks polos). */
  html?: string;
}

/**
 * Kirim email ke penerima (per-user).
 * Mengembalikan true jika berhasil, false jika gagal atau belum dikonfigurasi.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!isEmailConfigured() || !payload.to) return false;
  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: payload.to,
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

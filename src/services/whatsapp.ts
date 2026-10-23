import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { WHATSAPP_PAIRING_TTL_MINUTES } from "@/utils/config/variables";

/**
 * Data-access WhatsApp di FE (Next.js): pembuatan KODE PAIRING per user dan
 * link nomor (JID) ↔ akun untuk ditampilkan di UI.
 *
 * Pemakaian tabel dibagi dengan service BE (savings-goal-tracker-be):
 * - FE membuat kode (whatsapp_pairings) & membaca/melepas link.
 * - BE mengonsumsi kode saat user kirim "link <kode>" dari WhatsApp,
 *   mencatat transaksi, dan memelihara status bot (whatsapp_account).
 * Seluruh logika bot (parser, handler, proteksi) hidup di BE.
 */

function hashPairingCode(code: string): string {
  return createHash("sha256").update(`sgt-wa:${code}`).digest("hex");
}

/**
 * Buat kode pairing 6 digit untuk user login (menggantikan kode lama yang
 * belum dipakai). Kode asli tidak disimpan — hanya sha256-nya. User lalu
 * mengirim "link <kode>" dari WhatsApp-nya ke nomor bot (dikonsumsi BE).
 */
export async function createPairingCode(userId: string): Promise<{
  code: string;
  expiresAt: Date;
}> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + WHATSAPP_PAIRING_TTL_MINUTES * 60_000);
  await prisma.$transaction([
    // Satu kode aktif per user: hapus kode lama yang belum dikonsumsi.
    prisma.whatsAppPairing.deleteMany({
      where: { userId, consumedAt: null },
    }),
    prisma.whatsAppPairing.create({
      data: { userId, codeHash: hashPairingCode(code), expiresAt },
    }),
  ]);
  return { code, expiresAt };
}

/** Link milik user login (untuk UI status integrasi WhatsApp). */
export async function getLinkByUser(userId: string): Promise<{
  jid: string;
  linkedAt: Date;
} | null> {
  const link = await prisma.whatsAppLink.findFirst({ where: { userId } });
  return link ? { jid: link.jid, linkedAt: link.linkedAt } : null;
}

/** Putuskan nomor WhatsApp dari akun user (dipanggil UI web). */
export async function unlinkByUser(userId: string): Promise<void> {
  await prisma.whatsAppLink.deleteMany({ where: { userId } });
}

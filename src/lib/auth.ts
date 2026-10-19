import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { User as PrismaUser } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  MAX_SESSIONS_PER_USER,
  NODE_ENV,
  SESSION_COOKIE,
  SESSION_TTL_HOURS,
} from "@/utils/config/variables";

/**
 * Sesi login custom (pola tourism-village):
 * - Token opaque 32 byte (base64url) disimpan di cookie httpOnly.
 * - DB menyimpan sha256(token) sebagai id UserSession.
 * - TTL terbatas; maks MAX_SESSIONS_PER_USER sesi per user.
 * - B6 (rekomendasi_feature.md): sliding session — expiresAt diperpanjang
 *   saat aktivitas bila sisa masa aktif < SESSION_SLIDE_THRESHOLD_MS,
 *   sehingga sesi aktif awet tapi sesi terlantar cepat mati.
 */

const SESSION_TTL_MS = SESSION_TTL_HOURS * 3_600_000;
/** Ambang sliding: perpanjang bila sisa masa aktif sudah di bawah ini. */
const SESSION_SLIDE_THRESHOLD_MS = 7 * 24 * 3_600_000; // 7 hari

function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Buat sesi baru untuk user (trim sesi lama + hapus expired). */
export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.userSession.create({
    data: { id: hashSessionToken(token), userId, expiresAt },
  });

  // Bersihkan sesi kadaluarsa + batasi jumlah sesi per user.
  await prisma.userSession.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });
  const active = await prisma.userSession.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (active.length > MAX_SESSIONS_PER_USER) {
    const toDelete = active
      .slice(0, active.length - MAX_SESSIONS_PER_USER)
      .map((s) => s.id);
    await prisma.userSession.deleteMany({ where: { id: { in: toDelete } } });
  }

  return { token, expiresAt };
}

/** Opsi cookie sesi (httpOnly, sameSite lax, secure di production). */
export function applySessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    expires: expiresAt,
    path: "/",
    secure: NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  });
}

/** Hapus baris sesi di DB + cookie di response. */
export async function destroySession(
  response: NextResponse,
  token: string | undefined,
): Promise<void> {
  if (token) {
    await prisma.userSession
      .delete({ where: { id: hashSessionToken(token) } })
      .catch(() => {});
  }
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    expires: new Date(0),
    path: "/",
  });
}

/** Validasi token sesi → userId (null bila invalid/kadaluarsa). */
export async function getUserIdFromToken(
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  const session = await prisma.userSession.findUnique({
    where: { id: hashSessionToken(token) },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.userSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.userId;
}

/**
 * Sesi saat ini (validasi + sliding) dari cookie sesi.
 *
 * Dibungkus React `cache()` (pola resmi Next.js 16 untuk akses DB non-fetch):
 * deduplikasi dalam satu render pass — layout + section yang sama-sama
 * memanggil getCurrentUser()/getCurrentSession() hanya mengeksekusi 1 query
 * gabungan (session + user via `include`), bukan 2 query berurutan per
 * pemanggil.
 *
 * B6 sliding session: bila sisa masa aktif < SESSION_SLIDE_THRESHOLD_MS,
 * expiresAt di DB diperpanjang penuh (now + TTL). Ekstensi cookie HTTP
 * TIDAK bisa dilakukan di sini (Server Component tidak boleh menulis
 * cookie — lihat docs cookies Next.js); cookie disinkronkan route handler
 * /api/web/auth/session via syncSessionCookie() — shell klien memanggilnya
 * berkala saat user aktif.
 */
export const getCurrentSession = cache(
  async (): Promise<{ user: PrismaUser; expiresAt: Date } | null> => {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = await prisma.userSession.findUnique({
      where: { id: hashSessionToken(token) },
      include: { user: true },
    });
    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await prisma.userSession.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }
    let { expiresAt } = session;
    if (expiresAt.getTime() - Date.now() < SESSION_SLIDE_THRESHOLD_MS) {
      expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await prisma.userSession
        .update({ where: { id: session.id }, data: { expiresAt } })
        .catch(() => {});
    }
    return { user: session.user, expiresAt };
  },
);

/**
 * User saat ini dari cookie sesi (untuk server component / route handler).
 * Turunan cache'd dari getCurrentSession() — sama-sama 1 query per request.
 */
export const getCurrentUser = cache(async () => {
  const current = await getCurrentSession();
  return current?.user ?? null;
});

/**
 * Sinkronkan kedaluwarsa cookie sesi dengan expiresAt DB (B6).
 *
 * Hanya boleh dipanggil dari route handler / server action (di sana cookie
 * boleh ditulis). Cookie browser tidak bisa dibaca tanggal kedaluwarsanya,
 * jadi cookie selalu di-set ulang mengikuti expiresAt DB terbaru — begitu
 * DB di-slide oleh getCurrentSession(), cookie ikut memanjang.
 */
export async function syncSessionCookie(response: NextResponse): Promise<void> {
  const current = await getCurrentSession();
  if (!current) return;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return;
  applySessionCookie(response, token, current.expiresAt);
}

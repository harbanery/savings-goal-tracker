import { createHash } from "node:crypto";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_CYCLE_START_DAY,
  DEFAULT_SAVINGS_INITIAL,
} from "@/utils/config/variables";

/**
 * Data user: sesi, settings, dan defaults saat register pertama.
 *
 * User baru sengaja dibuat polos: saldo awal 0 dan TANPA wadah/subkategori
 * default — semuanya dikonfigurasi sendiri lewat halaman Pengaturan
 * (lihat DROID.md: "untuk data user baru, saldo awal masih 0, dan
 * wadah & subkategori kosong"). Satu-satunya wadah bawaan adalah "Cash"
 * (jenis dompet CASH) sesuai insight DROID.md.
 */

/** UUID deterministik (format v4, derivasi sha256) — id wadah Cash bawaan.
 *  Deterministik per user → upsert idempoten walau dipanggil bersamaan. */
function cashWalletId(userId: string): string {
  const h = createHash("sha256").update(`cash:${userId}`).digest("hex");
  const bytes = h.slice(0, 32).split("");
  // Set versi 4 dan variant 10xx agar lolos validasi UUID.
  bytes[12] = "4";
  const variant = parseInt(bytes[16], 16);
  bytes[16] = (0x8 | (variant & 0x3)).toString(16);
  const hex = bytes.join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/**
 * Pastikan user punya settings default + wadah "Cash" bawaan (idempoten &
 * aman race-condition). Dipanggil setelah register Google pertama kali —
 * layout dan page bisa memanggilnya bersamaan, jadi wajib upsert dengan id
 * deterministik (bukan find-then-create).
 *
 * Dibungkus React `cache()`: bila layout DAN section memanggilnya di
 * render pass yang sama, eksekusi hanya 1× (bukan 2× upsert per request).
 */
export const ensureUserDefaults = cache(async (userId: string): Promise<void> => {
  await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      cycleStartDay: DEFAULT_CYCLE_START_DAY,
      savingsInitial: DEFAULT_SAVINGS_INITIAL,
    },
  });

  // Wadah Cash bawaan (jenis dompet CASH): id deterministik membuat upsert
  // idempoten — pemanggilan paralel tidak menghasilkan duplikat.
  await prisma.category.upsert({
    where: { id: cashWalletId(userId) },
    update: {},
    create: {
      id: cashWalletId(userId),
      userId,
      name: "Cash",
      color: "#0d9488",
      walletType: "CASH",
      allocation: 0,
      order: -1,
    },
  });
});

/** Identitas user + settings untuk API session. */
export async function getSessionUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      lastLoginAt: true,
      settings: {
        select: { cycleStartDay: true, savingsInitial: true },
      },
    },
  });
}

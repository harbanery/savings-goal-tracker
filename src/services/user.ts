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
 * wadah & subkategori kosong").
 */

/**
 * Pastikan user punya settings default (idempoten & aman race-condition).
 * Dipanggil setelah register Google pertama kali — layout dan page bisa
 * memanggilnya bersamaan, jadi wajib upsert (bukan find-then-create).
 */
export async function ensureUserDefaults(userId: string): Promise<void> {
  await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      cycleStartDay: DEFAULT_CYCLE_START_DAY,
      savingsInitial: DEFAULT_SAVINGS_INITIAL,
    },
  });
}

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

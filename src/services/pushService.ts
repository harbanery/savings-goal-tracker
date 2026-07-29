import { prisma } from "@/server/db";
import { withRetry } from "@/server/prismaRetry";
import type { PushSubscriptions } from "@prisma/client";

/** Simpan (atau update) subscription push notification. */
export async function upsertSubscription(
  endpoint: string,
  keys: { p256dh: string; auth: string },
): Promise<void> {
  await withRetry(() =>
    prisma.pushSubscriptions.upsert({
      where: { endpoint },
      update: { keys },
      create: { endpoint, keys },
    }),
  );
}

/** Hapus subscription berdasarkan endpoint. */
export async function removeSubscription(endpoint: string): Promise<void> {
  await withRetry(() =>
    prisma.pushSubscriptions.deleteMany({ where: { endpoint } }),
  );
}

/** Ambil semua subscription aktif. */
export async function getAllSubscriptions(): Promise<PushSubscriptions[]> {
  return withRetry(() => prisma.pushSubscriptions.findMany());
}

/** Hapus subscription yang sudah tidak valid (endpoint expired). */
export async function removeStaleSubscription(endpoint: string): Promise<void> {
  await withRetry(() =>
    prisma.pushSubscriptions.deleteMany({ where: { endpoint } }),
  );
}

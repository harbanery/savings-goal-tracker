import { prisma, withRetry } from "@/lib/prisma";

/** Simpan (atau update) subscription push notification milik user. */
export async function upsertSubscription(
  userId: string,
  endpoint: string,
  keys: { p256dh: string; auth: string },
): Promise<void> {
  await withRetry(() =>
    prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { keys, userId },
      create: { endpoint, keys, userId },
    }),
  );
}

/** Hapus subscription berdasarkan endpoint. */
export async function removeSubscription(endpoint: string): Promise<void> {
  await withRetry(() =>
    prisma.pushSubscription.deleteMany({ where: { endpoint } }),
  );
}

/** Ambil semua subscription aktif milik satu user. */
export async function getSubscriptionsOfUser(
  userId: string,
): Promise<{ endpoint: string; keys: unknown }[]> {
  return withRetry(() =>
    prisma.pushSubscription.findMany({
      where: { userId },
      select: { endpoint: true, keys: true },
    }),
  );
}

/** Hapus subscription yang sudah tidak valid (endpoint expired). */
export async function removeStaleSubscription(endpoint: string): Promise<void> {
  await withRetry(() =>
    prisma.pushSubscription.deleteMany({ where: { endpoint } }),
  );
}

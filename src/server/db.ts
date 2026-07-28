import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton.
 * Mencegah pembukaan koneksi baru di setiap hot-reload saat development
 * dengan menyimpan instance PrismaClient pada `globalThis`.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  // Hubungkan segera agar koneksi siap dipakai sebelum query pertama.
  client.$connect().catch((err) => {
    console.error("[prisma] gagal koneksi awal:", err);
  });
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Graceful shutdown: tutup koneksi Prisma saat proses berakhir.
 */
for (const signal of ["beforeExit", "SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    prisma.$disconnect().catch(() => {});
  });
}

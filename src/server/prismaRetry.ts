import { prisma } from "@/server/db";

/**
 * Utility untuk menjalankan operasi Prisma dengan retry otomatis.
 *
 * Menangani transient error seperti "Server has closed the connection"
 * (P1001/P1002/P1017) yang sering muncul saat hot-reload di development
 * atau saat connection pooler menutup koneksi idle.
 */

const RETRYABLE_PRISMA_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Server has closed the connection
  "P1017", // Server has closed the connection
  "P1021", // Timed out fetching connection from pool
]);

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 300;

function isTransientError(err: unknown): boolean {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: string }).code;
    return RETRYABLE_PRISMA_CODES.has(code ?? "");
  }
  const message = err instanceof Error ? err.message : String(err);
  return /closed the connection|can't reach|timed out/i.test(message);
}

/**
 * Eksekusi `operation` dengan retry pada transient connection error.
 * Sebelum retry, koneksi Prisma di-reconnect terlebih dahulu.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  attempts = MAX_ATTEMPTS,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (!isTransientError(err) || attempt === attempts) {
        throw err;
      }
      try {
        await prisma.$connect();
      } catch {
        // ignore; error reconnect akan tertangkap di iterasi berikutnya
      }
      const delay = BASE_DELAY_MS * attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

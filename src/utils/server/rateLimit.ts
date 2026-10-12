/**
 * Rate limiter in-memory (fixed window) untuk endpoint sensitif —
 * rekomendasi B3 (rekomendasi_feature.md).
 *
 * Alternatif tanpa dependensi eksternal (Upstash Ratelimit): counter per
 * instance serverless. Kurang akurat lintas instance (tiap instance punya
 * map sendiri), tapi cukup menyaring abuse kasar: spam consent Google di
 * /api/web/auth/google/* dan flood subscription di /api/web/push/*.
 *
 * Pure module — tidak memakai API Node khusus sehingga aman dipanggil dari
 * proxy.ts maupun route handler. Ganti isi `rateLimit()` bila nanti pindah
 * ke Redis (Upstash) tanpa mengubah pemanggilnya.
 */

/** Aturan batas untuk satu grup endpoint. */
export interface RateLimitRule {
  /** Prefix path yang dibatasi (dicocokkan dengan startsWith). */
  prefix: string;
  /** Maksimum request per window per IP. */
  limit: number;
  /** Durasi window dalam milidetik. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Detik sampai window reset (0 bila masih allowed). */
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Batas jumlah key (prefix + IP) di map agar tidak tumbuh tanpa kendali
 * bila IP dipalsukan/dirotasi — entri tersisa dibuang dari yang terlama.
 */
const MAX_KEYS = 10_000;

const buckets = new Map<string, Bucket>();

/**
 * Catat satu hit untuk `key` dan cek terhadap batas (fixed window).
 * Window baru dimulai otomatis saat bucket pertama kali dibuat/setelah
 * kedaluwarsa.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  // Sapu bucket kedaluwarsa hanya saat map melewati batas (amortisasi O(1)).
  if (buckets.size > MAX_KEYS) {
    for (const [k, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(k);
    }
    // Masih terlalu besar (IP dirotasi aktif) → buang dari yang terlama
    // (Map mempertahankan urutan insertion).
    while (buckets.size > MAX_KEYS / 2) {
      const oldest = buckets.keys().next().value;
      if (oldest === undefined) break;
      buckets.delete(oldest);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Cari aturan pertama yang prefix-nya cocok dengan pathname. */
export function matchRateLimitRule(
  pathname: string,
  rules: readonly RateLimitRule[],
): RateLimitRule | undefined {
  return rules.find((rule) => pathname.startsWith(rule.prefix));
}

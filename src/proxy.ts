import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/utils/config/variables";
import {
  matchRateLimitRule,
  rateLimit,
  type RateLimitRule,
} from "@/utils/server/rateLimit";

/**
 * Proteksi rute (Next.js 16: proxy.ts menggantikan middleware.ts).
 * Di sini hanya cek keberadaan cookie (cepat); validasi penuh terjadi
 * di route handler / server component via getCurrentUser().
 */

const PRIVATE_PAGES = new Set([
  "/",
  "/transactions",
  "/finance",
  "/needs",
  "/budget",
  "/target",
  "/reports",
]);
const PRIVATE_API_PREFIXES = ["/api/web/push"];

/**
 * Rate limit endpoint sensitif (rekomendasi B3): 10 req/menit untuk flow
 * Google OAuth (consent spam), 30 req/menit untuk push subscription
 * (flood subscribe/unsubscribe). Dihitung per IP, fixed window — lihat
 * src/utils/server/rateLimit.ts.
 */
const RATE_LIMIT_RULES: readonly RateLimitRule[] = [
  { prefix: "/api/web/auth/google/", limit: 10, windowMs: 60_000 },
  { prefix: "/api/web/push/", limit: 30, windowMs: 60_000 },
];

function hasSession(request: NextRequest): boolean {
  return Boolean(request.cookies.get(SESSION_COOKIE)?.value);
}

/**
 * IP klien dari header proxy terbalik (Vercel selalu menset x-forwarded-for
 * dan menimpa nilai dari client). Ambil entri pertama (paling kiri = klien).
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function proxy(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // Tolak mutasi API lintas situs (Origin ≠ Host). Fallback untuk request
  // tanpa Origin (rekomendasi B4): browser modern selalu mengirim
  // Sec-Fetch-Site pada fetch() — tolak bila konteksnya lintas situs.
  if (
    pathname.startsWith("/api/") &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method)
  ) {
    const requestOrigin = request.headers.get("origin");
    if (requestOrigin && requestOrigin !== origin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      !requestOrigin &&
      request.headers.get("sec-fetch-site") === "cross-site"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Rate limit endpoint sensitif — wajib sebelum early-return auth di bawah
  // agar /api/web/auth/google/* tetap tercakup.
  const rule = matchRateLimitRule(pathname, RATE_LIMIT_RULES);
  if (rule) {
    const { allowed, retryAfterSeconds } = rateLimit(
      `${rule.prefix}:${getClientIp(request)}`,
      rule.limit,
      rule.windowMs,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        },
      );
    }
  }

  // API auth selalu boleh.
  if (pathname.startsWith("/api/web/auth/")) {
    return NextResponse.next();
  }

  // API privat butuh sesi.
  if (PRIVATE_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!hasSession(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  // Halaman privat → redirect login bila belum ada sesi.
  if (PRIVATE_PAGES.has(pathname)) {
    if (!hasSession(request)) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  // Sudah login → jangan tampilkan halaman login lagi.
  if (pathname === "/login" && hasSession(request)) {
    return NextResponse.redirect(new URL("/", origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Semua kecuali aset statis & internals Next.
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|android|ios|images|docs).*)",
  ],
};

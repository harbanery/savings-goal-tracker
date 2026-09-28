import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/utils/config/variables";

/**
 * Proteksi rute (Next.js 16: proxy.ts menggantikan middleware.ts).
 * Di sini hanya cek keberadaan cookie (cepat); validasi penuh terjadi
 * di route handler / server component via getCurrentUser().
 */

const PRIVATE_PAGES = ["/", "/transactions", "/reports", "/settings"];
const PRIVATE_API_PREFIXES = ["/api/web/push"];

function hasSession(request: NextRequest): boolean {
  return Boolean(request.cookies.get(SESSION_COOKIE)?.value);
}

export function proxy(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // Tolak mutasi API lintas situs (Origin ≠ Host).
  if (
    pathname.startsWith("/api/") &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method)
  ) {
    const requestOrigin = request.headers.get("origin");
    if (requestOrigin && requestOrigin !== origin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  if (PRIVATE_PAGES.includes(pathname)) {
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

import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/google";
import { OAUTH_STATE_COOKIE } from "@/utils/config/variables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/web/auth/google/start?redirect=/
 * Mulai OAuth: set cookie state anti-CSRF lalu redirect ke Google.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  // Sanitasi redirect: hanya path internal.
  let redirectTo = url.searchParams.get("redirect") || "/";
  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    redirectTo = "/";
  }

  const state = randomBytes(16).toString("base64url");
  const response = NextResponse.redirect(buildGoogleAuthUrl(state));
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: Buffer.from(JSON.stringify({ state, redirectTo })).toString(
      "base64url",
    ),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 menit
    path: "/",
  });
  return response;
}

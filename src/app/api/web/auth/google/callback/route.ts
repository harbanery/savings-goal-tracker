import { NextResponse, type NextRequest } from "next/server";
import { applySessionCookie, createSession } from "@/lib/auth";
import { exchangeGoogleCode } from "@/lib/google";
import { prisma } from "@/lib/prisma";
import { ensureUserDefaults } from "@/services/user";
import { OAUTH_STATE_COOKIE } from "@/utils/config/variables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/web/auth/google/callback
 * Callback OAuth Google: validasi state → tukar code → login/register
 * → set cookie sesi → redirect ke halaman tujuan.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const loginUrl = (params?: string) =>
    new URL(`/login${params ? `?${params}` : ""}`, url.origin);

  // User membatalkan consent — diam-diam kembali ke login.
  if (url.searchParams.get("error") === "access_denied") {
    return NextResponse.redirect(loginUrl());
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateCookie = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !stateCookie) {
    return NextResponse.redirect(loginUrl("googleError=state"));
  }

  // Validasi state anti-CSRF.
  let redirectTo = "/";
  try {
    const payload = JSON.parse(
      Buffer.from(stateCookie, "base64url").toString("utf8"),
    ) as { state: string; redirectTo: string };
    if (payload.state !== state) throw new Error("state mismatch");
    if (
      typeof payload.redirectTo === "string" &&
      payload.redirectTo.startsWith("/") &&
      !payload.redirectTo.startsWith("//")
    ) {
      redirectTo = payload.redirectTo;
    }
  } catch {
    return NextResponse.redirect(loginUrl("googleError=state"));
  }

  // Tukar code → id_token terverifikasi.
  let identity;
  try {
    identity = await exchangeGoogleCode(code);
  } catch (err) {
    console.error("[google/callback] gagal tukar code:", err);
    return NextResponse.redirect(loginUrl("googleError=exchange"));
  }
  if (!identity) {
    return NextResponse.redirect(loginUrl("googleError=exchange"));
  }
  if (!identity.emailVerified) {
    return NextResponse.redirect(loginUrl("googleError=unverified"));
  }

  // Resolusi akun: cocokkan googleId dulu, lalu email.
  let user = await prisma.user.findUnique({
    where: { googleId: identity.sub },
  });
  if (!user) {
    user = await prisma.user.findUnique({ where: { email: identity.email } });
    if (user) {
      // Email sama: tautkan akun Google ke user existing.
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: identity.sub,
          avatar: user.avatar ?? identity.picture,
          emailVerified: true,
        },
      });
    } else {
      // Register otomatis: email Google sudah terverifikasi.
      user = await prisma.user.create({
        data: {
          email: identity.email,
          name: identity.name,
          avatar: identity.picture,
          googleId: identity.sub,
          emailVerified: true,
        },
      });
    }
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { avatar: identity.picture ?? user.avatar },
    });
  }

  await ensureUserDefaults(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.redirect(new URL(redirectTo, url.origin));
  applySessionCookie(response, token, expiresAt);
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: "",
    expires: new Date(0),
    path: "/",
  });
  return response;
}

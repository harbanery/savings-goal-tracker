import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/utils/config/variables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/web/auth/logout — hapus sesi DB + cookie. */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  await destroySession(response, request.cookies.get(SESSION_COOKIE)?.value);
  return response;
}

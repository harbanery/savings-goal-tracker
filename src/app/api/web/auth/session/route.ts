import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSessionUser } from "@/services/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/web/auth/session — user saat ini + settings (401 bila belum login). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = await getSessionUser(user.id);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(session);
}

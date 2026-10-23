import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { unlinkByUser } from "@/services/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** DELETE /api/web/whatsapp/link — putuskan nomor WhatsApp dari akun. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await unlinkByUser(user.id);
  return NextResponse.json({ success: true });
}

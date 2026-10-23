import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPairingCode } from "@/services/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/web/whatsapp/link-code — buat kode pairing 6 digit baru
 * (menggantikan kode aktif lama). User mengirim "link <kode>" dari
 * WhatsApp-nya ke nomor bot untuk menghubungkan nomor ke akun ini.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { code, expiresAt } = await createPairingCode(user.id);
  return NextResponse.json({
    code,
    expiresAt: expiresAt.toISOString(),
  });
}

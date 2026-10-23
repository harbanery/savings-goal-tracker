import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLinkByUser } from "@/services/whatsapp";
import {
  WHATSAPP_BOT_API_URL,
  WHATSAPP_INTERNAL_SECRET,
  WHATSAPP_IS_CONFIGURED,
} from "@/utils/config/variables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/web/whatsapp/status — status bot (dari service BE terpisah) +
 * link nomor user login. Bila BE belum dikonfigurasi (URL/secret kosong),
 * bot dilaporkan nonaktif tanpa memanggil BE (fail-closed).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let bot: { status: string; phone: string | null } = {
    status: WHATSAPP_IS_CONFIGURED ? "disconnected" : "not-configured",
    phone: null,
  };
  if (WHATSAPP_IS_CONFIGURED) {
    try {
      const res = await fetch(`${WHATSAPP_BOT_API_URL}/api/bot/status`, {
        headers: { "x-internal-secret": WHATSAPP_INTERNAL_SECRET },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) bot = (await res.json()) as typeof bot;
    } catch {
      // BE tidak terjangkau → tampilkan bot nonaktif (jangan gagalkan modal).
    }
  }

  const link = await getLinkByUser(user.id);
  return NextResponse.json({
    bot,
    link: link
      ? { jid: link.jid, linkedAt: link.linkedAt.toISOString() }
      : null,
  });
}

import { NextResponse } from "next/server";
import { CRON_SECRET, NODE_ENV } from "@/config/variables";
import {
  buildYearlyRecap,
  broadcastEmailNotification,
} from "@/server/notificationBuilder";

/**
 * GET /api/cron/yearly-recap
 * Vercel Cron tanggal 31 Desember jam 23:59 WIB (16:59 UTC).
 * Email rekap akhir tahunan: tren tahunan, total pengeluaran, estimasi tabungan,
 * dan top 3 wadah pengeluaran terbesar selama 1 tahun (1 Jan s/d 31 Des).
 * Channel: email.
 *
 * Jadwal: 59 16 31 12 * → UTC, yaitu 23:59 WIB tanggal 31 Desember.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await buildYearlyRecap();
    if (!payload) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message:
          "Yearly recap skipped — no data for the current year.",
      });
    }
    const result = await broadcastEmailNotification(payload);
    return NextResponse.json({ success: true, ...result, preview: payload });
  } catch (err) {
    console.error("[cron/yearly-recap] error:", err);
    return NextResponse.json(
      { error: "Failed to send yearly recap email" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cron/yearly-recap
 * Endpoint development (tanpa CRON_SECRET).
 */
export async function POST() {
  if (NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode." },
      { status: 403 },
    );
  }

  try {
    const payload = await buildYearlyRecap();
    if (!payload) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: "Yearly recap skipped — no data for the current year.",
      });
    }
    const result = await broadcastEmailNotification(payload);
    return NextResponse.json({
      success: true,
      message: result.emailed
        ? "Yearly recap email sent (dev mode)."
        : "Email not sent — SMTP not configured (dev mode).",
      ...result,
      preview: {
        title: payload.title,
        tag: payload.tag,
        previewText: payload.previewText,
      },
    });
  } catch (err) {
    console.error("[cron/yearly-recap POST] error:", err);
    return NextResponse.json(
      { error: "Failed to send yearly recap email" },
      { status: 500 },
    );
  }
}

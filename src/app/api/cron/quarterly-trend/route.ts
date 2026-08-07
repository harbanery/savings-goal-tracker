import { NextResponse } from "next/server";
import { CRON_SECRET, NODE_ENV } from "@/config/variables";
import {
  buildQuarterlyTrend,
  broadcastEmailNotification,
} from "@/server/notificationBuilder";

/**
 * GET /api/cron/quarterly-trend
 * Vercel Cron tanggal 24 jam 23:59 WIB (16:59 UTC) — bulan Mar/Jun/Sep/Des.
 * Email laporan tren tabungan triwulanan (3 siklus sebelumnya).
 * Channel: email.
 *
 * Jadwal: 59 16 24 3,6,9,12 * → UTC, yaitu 23:59 WIB tanggal 24 (Mar/Jun/Sep/Des).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await buildQuarterlyTrend();
    if (!payload) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message:
          "Quarterly trend skipped — not yet at a quarterly boundary or insufficient data.",
      });
    }
    const result = await broadcastEmailNotification(payload);
    return NextResponse.json({ success: true, ...result, preview: payload });
  } catch (err) {
    console.error("[cron/quarterly-trend] error:", err);
    return NextResponse.json(
      { error: "Failed to send quarterly trend report" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cron/quarterly-trend
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
    const payload = await buildQuarterlyTrend();
    if (!payload) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: "Quarterly trend skipped — insufficient data.",
      });
    }
    const result = await broadcastEmailNotification(payload);
    return NextResponse.json({
      success: true,
      message: result.emailed
        ? "Quarterly trend email sent (dev mode)."
        : "Email not sent — SMTP not configured (dev mode).",
      ...result,
      preview: {
        title: payload.title,
        tag: payload.tag,
        previewText: payload.previewText,
      },
    });
  } catch (err) {
    console.error("[cron/quarterly-trend POST] error:", err);
    return NextResponse.json(
      { error: "Failed to send quarterly trend report" },
      { status: 500 },
    );
  }
}

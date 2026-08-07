import { NextResponse } from "next/server";
import { CRON_SECRET, NODE_ENV } from "@/config/variables";
import {
  buildMonthlySummary,
  broadcastEmailNotification,
} from "@/server/notificationBuilder";

/**
 * GET /api/cron/monthly-summary
 * Vercel Cron tanggal 24 jam 21:00 WIB (14:00 UTC).
 * Rekap akhir siklus (End-of-Cycle Recap) via email.
 * Channel: email.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await buildMonthlySummary();
    const result = await broadcastEmailNotification(payload);
    return NextResponse.json({ success: true, ...result, preview: payload });
  } catch (err) {
    console.error("[cron/monthly-summary] error:", err);
    return NextResponse.json(
      { error: "Failed to send monthly summary" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cron/monthly-summary
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
    const payload = await buildMonthlySummary();
    const result = await broadcastEmailNotification(payload);
    return NextResponse.json({
      success: true,
      message: result.emailed
        ? "Monthly summary email sent (dev mode)."
        : "Email not sent — SMTP not configured (dev mode).",
      ...result,
      preview: {
        title: payload.title,
        tag: payload.tag,
        previewText: payload.previewText,
      },
    });
  } catch (err) {
    console.error("[cron/monthly-summary POST] error:", err);
    return NextResponse.json(
      { error: "Failed to send monthly summary" },
      { status: 500 },
    );
  }
}

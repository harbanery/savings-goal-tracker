import { NextResponse } from "next/server";
import { CRON_SECRET, NODE_ENV } from "@/config/variables";
import {
  buildTrackingNudge,
  broadcastPushNotification,
} from "@/server/notificationBuilder";

/**
 * GET /api/cron/tracking-nudge
 * Vercel Cron setiap hari jam 20:00 WIB (13:00 UTC).
 * Push notification hanya jika belum ada transaksi hari ini.
 * Channel: web push.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await buildTrackingNudge();
    if (!payload) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: "Tracking nudge skipped — purchases already logged today.",
      });
    }
    const result = await broadcastPushNotification(payload);
    return NextResponse.json({ success: true, ...result, preview: payload });
  } catch (err) {
    console.error("[cron/tracking-nudge] error:", err);
    return NextResponse.json(
      { error: "Failed to send tracking nudge" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cron/tracking-nudge
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
    const payload = await buildTrackingNudge();
    if (!payload) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: "Tracking nudge skipped — purchases already logged today.",
      });
    }
    const result = await broadcastPushNotification(payload);
    return NextResponse.json({
      success: true,
      message: "Tracking nudge push sent (dev mode).",
      ...result,
      preview: payload,
    });
  } catch (err) {
    console.error("[cron/tracking-nudge POST] error:", err);
    return NextResponse.json(
      { error: "Failed to send tracking nudge" },
      { status: 500 },
    );
  }
}

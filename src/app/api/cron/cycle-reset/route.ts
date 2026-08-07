import { NextResponse } from "next/server";
import { CRON_SECRET, NODE_ENV } from "@/config/variables";
import {
  buildCycleResetReminder,
  broadcastPushNotification,
} from "@/server/notificationBuilder";

/**
 * GET /api/cron/cycle-reset
 * Vercel Cron H-1 siklus: setiap tanggal 24 jam 20:00 WIB (13:00 UTC).
 * Push notification mengingatkan siklus berakhir besok.
 * Channel: web push.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await buildCycleResetReminder();
    const result = await broadcastPushNotification(payload);
    return NextResponse.json({ success: true, ...result, preview: payload });
  } catch (err) {
    console.error("[cron/cycle-reset] error:", err);
    return NextResponse.json(
      { error: "Failed to send cycle reset reminder" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cron/cycle-reset
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
    const payload = await buildCycleResetReminder();
    const result = await broadcastPushNotification(payload);
    return NextResponse.json({
      success: true,
      message: "Cycle reset reminder push sent (dev mode).",
      ...result,
      preview: payload,
    });
  } catch (err) {
    console.error("[cron/cycle-reset POST] error:", err);
    return NextResponse.json(
      { error: "Failed to send cycle reset reminder" },
      { status: 500 },
    );
  }
}

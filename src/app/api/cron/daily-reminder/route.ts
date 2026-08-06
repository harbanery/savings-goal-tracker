import { NextResponse } from "next/server";
import { CRON_SECRET, NODE_ENV } from "@/config/variables";
import { buildDailyNotification, broadcastPushNotification } from "@/server/notificationBuilder";

/**
 * GET /api/cron/daily-reminder
 * Dipanggil oleh Vercel Cron setiap hari jam 21:00 WIB (14:00 UTC).
 * Mengirim pengingat catat pengeluaran + insight siklus via push notification saja.
 */
export async function GET(request: Request) {
  // Verifikasi CRON_SECRET dari header Authorization
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await buildDailyNotification();
    const result = await broadcastPushNotification(payload);
    return NextResponse.json({
      success: true,
      ...result,
      preview: payload,
    });
  } catch (err) {
    console.error("[cron/daily-reminder] error:", err);
    return NextResponse.json(
      { error: "Failed to send daily push notification" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cron/daily-reminder
 * Endpoint development untuk mengirim push notification manual.
 * Hanya aktif ketika NODE_ENV === "development" (tanpa CRON_SECRET).
 * Menggunakan builder yang sama dengan GET.
 */
export async function POST() {
  if (NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode." },
      { status: 403 },
    );
  }

  try {
    const payload = await buildDailyNotification();
    const result = await broadcastPushNotification(payload);
    return NextResponse.json({
      success: true,
      message: "Daily reminder push sent (dev mode).",
      ...result,
      preview: payload,
    });
  } catch (err) {
    console.error("[cron/daily-reminder POST] error:", err);
    return NextResponse.json(
      { error: "Failed to send daily push notification" },
      { status: 500 },
    );
  }
}

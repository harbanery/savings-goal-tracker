import { NextResponse } from "next/server";
import { CRON_SECRET } from "@/config/variables";
import { buildDailyNotification, broadcastNotification } from "@/server/notificationBuilder";

/**
 * GET /api/cron/daily-reminder
 * Dipanggil oleh Vercel Cron setiap hari jam 21:00 WIB (14:00 UTC).
 * Mengirim pengingat catat pengeluaran + insight siklus ke semua subscriber.
 */
export async function GET(request: Request) {
  // Verifikasi CRON_SECRET dari header Authorization
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await buildDailyNotification();
    const result = await broadcastNotification(payload);
    return NextResponse.json({
      success: true,
      ...result,
      preview: payload,
    });
  } catch (err) {
    console.error("[cron/daily-reminder] error:", err);
    return NextResponse.json(
      { error: "Failed to send daily notification" },
      { status: 500 },
    );
  }
}

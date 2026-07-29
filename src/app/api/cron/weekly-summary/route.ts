import { NextResponse } from "next/server";
import { CRON_SECRET } from "@/config/variables";
import { buildWeeklyNotification, broadcastNotification } from "@/server/notificationBuilder";

/**
 * GET /api/cron/weekly-summary
 * Dipanggil oleh Vercel Cron setiap hari Minggu jam 20:00 WIB (13:00 UTC).
 * Mengirim ringkasan statistik siklus + insight (pengeluaran, tabungan, kategori).
 */
export async function GET(request: Request) {
  // Verifikasi CRON_SECRET dari header Authorization
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await buildWeeklyNotification();
    const result = await broadcastNotification(payload);
    return NextResponse.json({
      success: true,
      ...result,
      preview: payload,
    });
  } catch (err) {
    console.error("[cron/weekly-summary] error:", err);
    return NextResponse.json(
      { error: "Failed to send weekly notification" },
      { status: 500 },
    );
  }
}

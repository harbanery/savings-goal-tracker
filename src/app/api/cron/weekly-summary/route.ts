import { NextResponse } from "next/server";
import { CRON_SECRET, NODE_ENV } from "@/config/variables";
import { buildWeeklyNotification, broadcastEmailNotification } from "@/server/notificationBuilder";

/**
 * GET /api/cron/weekly-summary
 * Dipanggil oleh Vercel Cron setiap hari Minggu jam 20:00 WIB (13:00 UTC).
 * Mengirim ringkasan statistik siklus + insight via email saja.
 */
export async function GET(request: Request) {
  // Verifikasi CRON_SECRET dari header Authorization
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await buildWeeklyNotification();
    const result = await broadcastEmailNotification(payload);
    return NextResponse.json({
      success: true,
      ...result,
      preview: payload,
    });
  } catch (err) {
    console.error("[cron/weekly-summary] error:", err);
    return NextResponse.json(
      { error: "Failed to send weekly email summary" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cron/weekly-summary
 * Endpoint development untuk mengirim email manual.
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
    const payload = await buildWeeklyNotification();
    const result = await broadcastEmailNotification(payload);
    return NextResponse.json({
      success: true,
      message: result.emailed
        ? "Weekly summary email sent (dev mode)."
        : "Email not sent — SMTP not configured (dev mode).",
      ...result,
      preview: {
        title: payload.title,
        tag: payload.tag,
        previewText: payload.previewText,
      },
    });
  } catch (err) {
    console.error("[cron/weekly-summary POST] error:", err);
    return NextResponse.json(
      { error: "Failed to send weekly email summary" },
      { status: 500 },
    );
  }
}

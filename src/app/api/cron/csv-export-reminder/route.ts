import { NextResponse } from "next/server";
import { CRON_SECRET, NODE_ENV } from "@/config/variables";
import {
  buildCsvExportReminder,
  broadcastEmailNotification,
} from "@/server/notificationBuilder";

/**
 * GET /api/cron/csv-export-reminder
 * Vercel Cron tanggal 23 jam 20:00 WIB (13:00 UTC) — pertengahan siklus.
 * Email pengingat backup data (export CSV).
 * Channel: email.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await buildCsvExportReminder();
    const result = await broadcastEmailNotification(payload);
    return NextResponse.json({ success: true, ...result, preview: payload });
  } catch (err) {
    console.error("[cron/csv-export-reminder] error:", err);
    return NextResponse.json(
      { error: "Failed to send CSV export reminder" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cron/csv-export-reminder
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
    const payload = await buildCsvExportReminder();
    const result = await broadcastEmailNotification(payload);
    return NextResponse.json({
      success: true,
      message: result.emailed
        ? "CSV export reminder email sent (dev mode)."
        : "Email not sent — SMTP not configured (dev mode).",
      ...result,
      preview: {
        title: payload.title,
        tag: payload.tag,
        previewText: payload.previewText,
      },
    });
  } catch (err) {
    console.error("[cron/csv-export-reminder POST] error:", err);
    return NextResponse.json(
      { error: "Failed to send CSV export reminder" },
      { status: 500 },
    );
  }
}

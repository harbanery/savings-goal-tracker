import { NextResponse } from "next/server";
import { CRON_SECRET, NODE_ENV } from "@/config/variables";
import {
  buildNewCycleKickoff,
  broadcastEmailNotification,
} from "@/server/notificationBuilder";

/**
 * GET /api/cron/new-cycle-kickoff
 * Vercel Cron tanggal 25 jam 08:00 WIB (01:00 UTC).
 * Email kickoff siklus baru + saran realokasi wadah (D2 + D4).
 * Channel: email.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await buildNewCycleKickoff();
    const result = await broadcastEmailNotification(payload);
    return NextResponse.json({ success: true, ...result, preview: payload });
  } catch (err) {
    console.error("[cron/new-cycle-kickoff] error:", err);
    return NextResponse.json(
      { error: "Failed to send new cycle kickoff" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cron/new-cycle-kickoff
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
    const payload = await buildNewCycleKickoff();
    const result = await broadcastEmailNotification(payload);
    return NextResponse.json({
      success: true,
      message: result.emailed
        ? "New cycle kickoff email sent (dev mode)."
        : "Email not sent — SMTP not configured (dev mode).",
      ...result,
      preview: {
        title: payload.title,
        tag: payload.tag,
        previewText: payload.previewText,
      },
    });
  } catch (err) {
    console.error("[cron/new-cycle-kickoff POST] error:", err);
    return NextResponse.json(
      { error: "Failed to send new cycle kickoff" },
      { status: 500 },
    );
  }
}

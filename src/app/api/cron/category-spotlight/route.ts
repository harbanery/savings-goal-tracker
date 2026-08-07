import { NextResponse } from "next/server";
import { CRON_SECRET, NODE_ENV } from "@/config/variables";
import {
  buildCategorySpotlight,
  broadcastPushNotification,
} from "@/server/notificationBuilder";

/**
 * GET /api/cron/category-spotlight
 * Vercel Cron setiap Jumat jam 20:00 WIB (13:00 UTC).
 * Push notification menampilkan wadah terboros minggu ini.
 * Channel: web push.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await buildCategorySpotlight();
    const result = await broadcastPushNotification(payload);
    return NextResponse.json({ success: true, ...result, preview: payload });
  } catch (err) {
    console.error("[cron/category-spotlight] error:", err);
    return NextResponse.json(
      { error: "Failed to send category spotlight" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cron/category-spotlight
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
    const payload = await buildCategorySpotlight();
    const result = await broadcastPushNotification(payload);
    return NextResponse.json({
      success: true,
      message: "Category spotlight push sent (dev mode).",
      ...result,
      preview: payload,
    });
  } catch (err) {
    console.error("[cron/category-spotlight POST] error:", err);
    return NextResponse.json(
      { error: "Failed to send category spotlight" },
      { status: 500 },
    );
  }
}

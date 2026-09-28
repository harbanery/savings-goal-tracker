import { createCronHandlers } from "@/utils/server/cronRoute";
import { buildTrackingNudge } from "@/utils/server/notificationBuilder";

/**
 * /api/cron/tracking-nudge
 * Vercel Cron setiap hari jam 20:00 WIB (13:00 UTC).
 * Push hanya untuk user yang belum mencatat transaksi hari ini.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createCronHandlers({
  name: "tracking-nudge",
  channel: "push",
  buildPush: buildTrackingNudge,
  failMessage: "Failed to send tracking nudge",
});

export const GET = handlers.GET;
export const POST = handlers.POST;

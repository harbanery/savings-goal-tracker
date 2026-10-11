import { createCronHandlers } from "@/utils/server/cronRoute";
import { buildQuarterlyTrend } from "@/utils/server/notificationBuilder";

/**
 * /api/cron/quarterly-trend
 * Laporan tren tabungan triwulanan (E1) — email per user.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createCronHandlers({
  name: "quarterly-trend",
  channel: "email",
  buildEmail: buildQuarterlyTrend,
  failMessage: "Failed to send quarterly trend",
});

export const GET = handlers.GET;
export const POST = handlers.POST;

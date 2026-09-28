import { createCronHandlers } from "@/utils/server/cronRoute";
import { buildCycleResetReminder } from "@/utils/server/notificationBuilder";

/**
 * /api/cron/cycle-reset
 * Pengingat H-1 akhir siklus (tanggal startDay-1 per user) — web push.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createCronHandlers({
  name: "cycle-reset",
  channel: "push",
  buildPush: buildCycleResetReminder,
  failMessage: "Failed to send cycle reset reminder",
});

export const GET = handlers.GET;
export const POST = handlers.POST;

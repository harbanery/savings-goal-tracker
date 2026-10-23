import { createCronHandlers } from "@/utils/server/cronRoute";
import { buildTargetDeadlineReminder } from "@/utils/server/notificationBuilder";

/**
 * /api/cron/target-deadline
 * Pengingat batas waktu target tabungan H-7 (rekomendasi D6) — web push
 * untuk target belum tercapai yang deadlinenya ≤ 7 hari lagi.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createCronHandlers({
  name: "target-deadline",
  channel: "push",
  buildPush: buildTargetDeadlineReminder,
  failMessage: "Failed to send target deadline reminder",
});

export const GET = handlers.GET;
export const POST = handlers.POST;

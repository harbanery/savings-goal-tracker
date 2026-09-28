import { createCronHandlers } from "@/utils/server/cronRoute";
import { buildNewCycleKickoff } from "@/utils/server/notificationBuilder";

/**
 * /api/cron/new-cycle-kickoff
 * Kickoff siklus baru + saran realokasi (D2+D4) — email per user.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createCronHandlers({
  name: "new-cycle-kickoff",
  channel: "email",
  buildEmail: buildNewCycleKickoff,
  failMessage: "Failed to send new cycle kickoff",
});

export const GET = handlers.GET;
export const POST = handlers.POST;

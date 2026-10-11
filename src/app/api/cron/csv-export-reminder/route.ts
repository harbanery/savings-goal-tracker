import { createCronHandlers } from "@/utils/server/cronRoute";
import { buildCsvExportReminder } from "@/utils/server/notificationBuilder";

/**
 * /api/cron/csv-export-reminder
 * Pengingat backup data via CSV export (E2) — email per user.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createCronHandlers({
  name: "csv-export-reminder",
  channel: "email",
  buildEmail: buildCsvExportReminder,
  failMessage: "Failed to send CSV export reminder",
});

export const GET = handlers.GET;
export const POST = handlers.POST;

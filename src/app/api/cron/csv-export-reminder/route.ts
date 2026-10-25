import { createCronHandlers } from "@/utils/server/cronRoute";
import { buildCsvExportReminder } from "@/utils/server/notificationBuilder";

/**
 * /api/cron/csv-export-reminder
 * Pengingat backup data via CSV export (E2) — email per user.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A6 (rekomendasi_feature.md): naikkan batas durasi agar broadcast email
// per user tidak kena timeout default fungsi serverless.
export const maxDuration = 60;

const handlers = createCronHandlers({
  name: "csv-export-reminder",
  channel: "email",
  buildEmail: buildCsvExportReminder,
  failMessage: "Failed to send CSV export reminder",
});

export const GET = handlers.GET;
export const POST = handlers.POST;

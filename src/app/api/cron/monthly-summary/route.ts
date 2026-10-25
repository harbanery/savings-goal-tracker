import { createCronHandlers } from "@/utils/server/cronRoute";
import { buildMonthlySummary } from "@/utils/server/notificationBuilder";

/**
 * /api/cron/monthly-summary
 * Rekap akhir siklus (D3) — email per user.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A6 (rekomendasi_feature.md): naikkan batas durasi agar broadcast email
// per user tidak kena timeout default fungsi serverless.
export const maxDuration = 60;

const handlers = createCronHandlers({
  name: "monthly-summary",
  channel: "email",
  buildEmail: buildMonthlySummary,
  failMessage: "Failed to send monthly summary",
});

export const GET = handlers.GET;
export const POST = handlers.POST;

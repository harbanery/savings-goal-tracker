import { createCronHandlers } from "@/utils/server/cronRoute";
import { buildYearlyRecap } from "@/utils/server/notificationBuilder";

/**
 * /api/cron/yearly-recap
 * Rekap akhir tahun + top wadah terboros (F1) — email per user.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A6 (rekomendasi_feature.md): naikkan batas durasi agar broadcast email
// per user tidak kena timeout default fungsi serverless.
export const maxDuration = 60;

const handlers = createCronHandlers({
  name: "yearly-recap",
  channel: "email",
  buildEmail: buildYearlyRecap,
  failMessage: "Failed to send yearly recap",
});

export const GET = handlers.GET;
export const POST = handlers.POST;

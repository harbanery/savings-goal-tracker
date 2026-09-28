import { createCronHandlers } from "@/utils/server/cronRoute";
import { buildCategorySpotlight } from "@/utils/server/notificationBuilder";

/**
 * /api/cron/category-spotlight
 * Vercel Cron mingguan Jumat jam 20:00 WIB — sorotan wadah terboros.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createCronHandlers({
  name: "category-spotlight",
  channel: "push",
  buildPush: buildCategorySpotlight,
  failMessage: "Failed to send category spotlight",
});

export const GET = handlers.GET;
export const POST = handlers.POST;

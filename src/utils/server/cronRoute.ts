import { NextResponse } from "next/server";
import { CRON_SECRET, NODE_ENV } from "@/utils/config/variables";
import {
  broadcastEmailToAllUsers,
  broadcastPushToAllUsers,
  type BroadcastResult,
  type NotificationPayload,
  type UserFinance,
} from "@/utils/server/notificationBuilder";

/**
 * Factory handler untuk endpoint cron (GET terlindungi CRON_SECRET,
 * POST khusus development). Semua notifikasi dijalankan PER USER.
 */

interface CronOptions {
  /** Nama unik untuk log/response. */
  name: string;
  /** Channel pengiriman. */
  channel: "push" | "email";
  /** Builder push (boleh null = skip user). */
  buildPush?: (
    ctx: UserFinance,
  ) => Promise<NotificationPayload | null>;
  /** Builder email (selalu mengirim). */
  buildEmail?: (ctx: UserFinance) => Promise<NotificationPayload>;
  /** Pesan error response. */
  failMessage: string;
}

async function runCron(
  opts: CronOptions,
): Promise<{ result: BroadcastResult | null; error?: string }> {
  if (opts.channel === "push" && opts.buildPush) {
    const result = await broadcastPushToAllUsers(opts.buildPush);
    return { result };
  }
  if (opts.channel === "email" && opts.buildEmail) {
    const result = await broadcastEmailToAllUsers(opts.buildEmail);
    return { result };
  }
  return { result: null, error: "cron misconfigured" };
}

export function createCronHandlers(opts: CronOptions) {
  async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const { result, error } = await runCron(opts);
      if (!result) {
        return NextResponse.json({ error }, { status: 500 });
      }
      return NextResponse.json({ success: true, ...result });
    } catch (err) {
      console.error(`[cron/${opts.name}] error:`, err);
      return NextResponse.json({ error: opts.failMessage }, { status: 500 });
    }
  }

  /** Endpoint development (tanpa CRON_SECRET). */
  async function POST() {
    if (NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "This endpoint is only available in development mode." },
        { status: 403 },
      );
    }

    try {
      const { result, error } = await runCron(opts);
      if (!result) {
        return NextResponse.json({ error }, { status: 500 });
      }
      const message =
        opts.channel === "push"
          ? result.sent > 0
            ? `${opts.name} push sent (dev mode).`
            : `${opts.name} skipped/no subscribers (dev mode).`
          : result.emailed > 0
            ? `${opts.name} email sent (dev mode).`
            : `${opts.name} email not sent — SMTP not configured (dev mode).`;
      return NextResponse.json({ success: true, message, ...result });
    } catch (err) {
      console.error(`[cron/${opts.name} POST] error:`, err);
      return NextResponse.json({ error: opts.failMessage }, { status: 500 });
    }
  }

  return { GET, POST };
}

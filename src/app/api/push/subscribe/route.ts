import { NextResponse } from "next/server";
import { upsertSubscription } from "@/services/pushService";

/** POST /api/push/subscribe - simpan push subscription baru. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint, keys } = body as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Missing endpoint or keys" },
        { status: 400 },
      );
    }

    await upsertSubscription(endpoint, {
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/push/subscribe] error:", err);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 },
    );
  }
}

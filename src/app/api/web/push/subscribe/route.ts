import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { upsertSubscription } from "@/services/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/web/push/subscribe - simpan push subscription milik user login. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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

    await upsertSubscription(user.id, endpoint, {
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/web/push/subscribe] error:", err);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { removeSubscription } from "@/services/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/web/push/unsubscribe - hapus push subscription. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint } = body as { endpoint?: string };

    if (!endpoint) {
      return NextResponse.json(
        { error: "Missing endpoint" },
        { status: 400 },
      );
    }

    await removeSubscription(endpoint);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/web/push/unsubscribe] error:", err);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 },
    );
  }
}

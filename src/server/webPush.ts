import webpush, { type PushSubscription as WebPushSubscription } from "web-push";
import { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT } from "@/config/variables";

let configured = false;

/** Konfigurasi web-push sekali (lazy init). */
function ensureConfigured(): void {
  if (configured) return;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
}

/**
 * Kirim push notification ke satu subscription.
 * Mengembalikan true jika berhasil, false jika gagal (mis. endpoint expired).
 */
export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: NotificationPayload,
): Promise<boolean> {
  ensureConfigured();
  const pushSub: WebPushSubscription = {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
  };
  try {
    await webpush.sendNotification(pushSub, JSON.stringify(payload));
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    // 404 = subscription expired, 410 = gone -> harus dihapus
    if (status === 404 || status === 410) {
      return false;
    }
    console.error("[web-push] error sending:", status, err);
    return false;
  }
}

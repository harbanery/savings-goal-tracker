import webpush, { type PushSubscription as WebPushSubscription } from "web-push";
import { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT } from "@/utils/config/variables";

let configured = false;

/**
 * Hostname layanan push resmi (suffix-match, subdomain diizinkan).
 * Endpoint di luar daftar ditolak supaya server tidak dipakai sebagai
 * relay request ke host arbitrer saat mengirim notifikasi
 * (rekomendasi_feature.md B5).
 */
const ALLOWED_PUSH_ENDPOINT_HOSTS = [
  "fcm.googleapis.com", // Chrome / Android (Firebase Cloud Messaging)
  "updates.push.services.mozilla.com", // Firefox (Mozilla autopush)
  "wns.windows.com", // Edge / Windows (Push Notification Service)
  "web.push.apple.com", // Safari 16.4+ (macOS / iOS)
];

/**
 * Validasi endpoint subscription push: wajib URL https valid dengan
 * hostname dari layanan push resmi.
 */
export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return ALLOWED_PUSH_ENDPOINT_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

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
  // Pertahanan berlapis: endpoint di DB yang tidak lolos validasi (mis.
  // row lama sebelum validasi subscribe ada) tidak pernah dikirimi
  // request — return false agar pemanggil membersihkannya sebagai stale.
  if (!isAllowedPushEndpoint(subscription.endpoint)) {
    console.error("[web-push] blocked non-allowlisted push endpoint");
    return false;
  }
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

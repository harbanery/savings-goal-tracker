/* global self, clients, fetch */
/* Service Worker untuk push notifications & PWA (savings-goal-tracker).
 *
 * Mendaftarkan diri pada scope "/" (lihat NotificationBell.tsx). Menangani:
 *  - `push`: menampilkan notifikasi dari payload server
 *      { title, body, tag, url, requireInteraction }.
 *  - `notificationclick`: fokus ke jendela yang ada atau membuka URL target.
 *  - `pushsubscriptionchange`: re-subscribe otomatis bila subscription berakhir.
 *
 * Catatan: SW ini sengaja minimal (tanpa offline caching). PWA tetap dapat
 * di-install karena memiliki manifest + SW + HTTPS.
 */

/** Ikon & badge default untuk notifikasi (dari folder platform). */
const DEFAULT_ICON = "/android/launchericon-192x192.png";
const DEFAULT_BADGE = "/android/launchericon-96x96.png";

/** VIBRATE pattern untuk perangkat yang mendukung. */
const VIBRATE_PATTERN = [100, 50, 100];

/**
 * Tampilkan notifikasi dari event push.
 * Tolerasi payload yang bukan JSON / kosong.
 */
async function showPushNotification(event) {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      // Fallback bila payload berupa plain text.
      payload = { title: "Notification", body: event.data.text() };
    }
  }

  const title = payload.title || "Savings Goal Tracker";
  const targetUrl = resolveUrl(payload.url || "/");

  const options = {
    body: payload.body || "",
    icon: payload.icon || DEFAULT_ICON,
    badge: payload.badge || DEFAULT_BADGE,
    tag: payload.tag || "savings-goal-tracker",
    renotify: true,
    data: {
      dateOfArrival: Date.now(),
      url: targetUrl,
    },
    vibrate: VIBRATE_PATTERN,
  };

  // requireInteraction menjaga notifikasi tetap tampil hingga diklik
  // (berguna untuk pengingat pengeluaran / ringkasan tabungan mingguan).
  if (payload.requireInteraction) {
    options.requireInteraction = true;
  }

  await self.registration.showNotification(title, options);
}

/** Ubah URL relatif (mis. "/") menjadi absolute berbasis origin SW. */
function resolveUrl(url) {
  if (!url) return self.location.origin + "/";
  try {
    return new URL(url, self.location.origin).href;
  } catch {
    return self.location.origin + "/";
  }
}

self.addEventListener("install", () => {
  // Aktivasi langsung tanpa menunggu SW lama berhenti.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Klaim semua klien agar SW langsung mengontrol halaman yang sudah terbuka.
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  event.waitUntil(showPushNotification(event));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    (event.notification.data && event.notification.data.url) ||
    self.location.origin + "/";

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Fokus ke jendela yang sudah menampilkan aplikasi (atau origin sama).
      for (const client of allClients) {
        if (client.url.startsWith(self.location.origin)) {
          if ("focus" in client) {
            await client.focus();
          }
          // Navigasi ke URL target bila berbeda.
          if ("navigate" in client && client.url !== targetUrl) {
            try {
              await client.navigate(targetUrl);
            } catch {
              // abaikan bila navigasi gagal
            }
          }
          return;
        }
      }

      // Tidak ada jendela aktif -> buka baru.
      if (clients.openWindow) {
        await clients.openWindow(targetUrl);
      }
    })(),
  );
});

/**
 * Re-subscribe otomatis bila browser memperbarui/mengganti subscription
 * (mis. saat endpoint kedaluwarsa). Mengirim subscription baru ke server.
 */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      if (!event.oldSubscription) return;
      // Hapus subscription lama di server.
      try {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: event.oldSubscription.endpoint }),
        });
      } catch {
        // abaikan
      }

      if (!event.newSubscription) return;
      // Daftarkan subscription baru ke server.
      try {
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event.newSubscription),
        });
      } catch {
        // abaikan
      }
    })(),
  );
});

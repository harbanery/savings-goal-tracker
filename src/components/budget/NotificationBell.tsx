"use client";

import { BellOutlined, BellFilled } from "@ant-design/icons";
import { App, Badge, Button, Tooltip } from "antd";
import { useCallback, useEffect, useSyncExternalStore, useState } from "react";
import { VAPID_PUBLIC_KEY } from "@/config/variables";
import { useLocale } from "@/components/locale/LocaleProvider";

/** URL base untuk API calls. */
const API_BASE = "/api/push";

/**
 * Deteksi client-side via useSyncExternalStore agar tidak ada hydration
 * mismatch: server snapshot selalu `false`, client snapshot selalu `true`.
 * Ini membuat tombol lonceng hanya muncul setelah hydration selesai.
 */
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/** Konversi base64 URL ke ArrayBuffer (untuk applicationServerKey). */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

/** Cek apakah browser mendukung push notifications. */
function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/**
 * Tombol lonceng untuk subscribe/unsubscribe push notifications.
 * Mendaftarkan service worker, meminta izin notifikasi,
 * dan menyimpan subscription ke server.
 *
 * Catatan: visibilitas tombol TIDAK bergantung pada keberhasilan
 * registrasi service worker. Tombol tampil selama browser mendukung
 * push (secure context + API tersedia), sehingga tetap muncul di
 * production meskipun ada masalah saat registrasi SW. Registrasi SW
 * hanya mempengaruhi status subscription, bukan tampilan tombol.
 */
export default function NotificationBell() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const { t } = useLocale();
  const { message } = App.useApp();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const supported = isClient && isPushSupported();

  useEffect(() => {
    if (!supported) return;
    // Cek status subscription saat ini
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      })
      .catch(() => {});
  }, [supported]);

  const handleSubscribe = useCallback(async () => {
    if (!isPushSupported()) return;
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        message.warning(t("notif.permissionDenied"));
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      // Kirim subscription ke server
      const res = await fetch(`${API_BASE}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      if (!res.ok) throw new Error("Failed to subscribe on server");
      setSubscribed(true);
      message.success(t("notif.enabled"));
    } catch (err) {
      console.error("[NotificationBell] subscribe error:", err);
      message.error(t("notif.enableFailed"));
    } finally {
      setLoading(false);
    }
  }, [t, message]);

  const handleUnsubscribe = useCallback(async () => {
    if (!isPushSupported()) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch(`${API_BASE}/unsubscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
      setSubscribed(false);
      message.info(t("notif.disabled"));
    } catch (err) {
      console.error("[NotificationBell] unsubscribe error:", err);
      message.error(t("notif.disableFailed"));
    } finally {
      setLoading(false);
    }
  }, [t, message]);

  if (!supported) return null;

  return (
    <Tooltip
      title={
        subscribed ? t("notif.activeTooltip") : t("notif.inactiveTooltip")
      }
    >
      <Badge dot={subscribed} offset={[-2, 2]} color="#6366f1">
        <Button
          shape="circle"
          icon={subscribed ? <BellFilled /> : <BellOutlined />}
          loading={loading}
          onClick={subscribed ? handleUnsubscribe : handleSubscribe}
        />
      </Badge>
    </Tooltip>
  );
}

"use client";

import { BellOutlined, BellFilled } from "@ant-design/icons";
import { Badge, Button, Tooltip, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { VAPID_PUBLIC_KEY } from "@/config/variables";

/** URL base untuk API calls. */
const API_BASE = "/api/push";

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
 */
export default function NotificationBell() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    // Cek status subscription saat ini
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        setSupported(true);
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      })
      .catch(() => {});
  }, []);

  const handleSubscribe = useCallback(async () => {
    if (!isPushSupported()) return;
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        message.warning("Izin notifikasi ditolak. Aktifkan di pengaturan browser.");
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
      message.success("Notifikasi diaktifkan! Anda akan mendapat pengingat pengeluaran & insight tabungan.");
    } catch (err) {
      console.error("[NotificationBell] subscribe error:", err);
      message.error("Gagal mengaktifkan notifikasi.");
    } finally {
      setLoading(false);
    }
  }, []);

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
      message.info("Notifikasi dinonaktifkan.");
    } catch (err) {
      console.error("[NotificationBell] unsubscribe error:", err);
      message.error("Gagal menonaktifkan notifikasi.");
    } finally {
      setLoading(false);
    }
  }, []);

  if (!supported) return null;

  return (
    <Tooltip
      title={
        subscribed
          ? "Notifikasi aktif. Klik untuk menonaktifkan."
          : "Aktifkan notifikasi untuk pengingat pengeluaran harian & insight tabungan mingguan."
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

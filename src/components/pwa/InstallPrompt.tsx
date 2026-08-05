"use client";

import { MobileOutlined } from "@ant-design/icons";
import { Button, Card } from "antd";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocale } from "@/components/locale/LocaleProvider";

/**
 * Prompt pemasangan PWA.
 *
 * - Pada Chromium (Android/Desktop): mendengarkan event `beforeinstallprompt`
 *   dan menampilkan tombol "Pasang".
 * - Pada iOS Safari: tidak ada event tersebut, jadi tampilkan instruksi
 *   "Add to Home Screen" sekali (bisa ditutup).
 * - Tidak ditampilkan jika aplikasi sudah berjalan dalam mode standalone
 *   (sudah terpasang) atau jika pengguna sudah menutupnya (disimpan di
 *   localStorage agar tidak mengganggu).
 *
 * Konten sepenuhnya dilokalkan melalui `useLocale()`.
 *
 * Menggunakan `useSyncExternalStore` (pola yang sama dengan NotificationBell)
 * agar SSR dan render awal klien selalu konsisten (tidak menampilkan prompt),
 * lalu beralih ke snapshot klien setelah mount — mencegah hydration mismatch.
 */

const DISMISS_KEY = "savings-goal-tracker:pwa-install-dismissed";

/** Event `beforeinstallprompt` (belum ada di lib.dom standar). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/** Apakah aplikasi sudah berjalan standalone (terpasang)? Hanya dipanggil di klien. */
function isStandaloneMode(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari flag
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Apakah perangkat iOS (perlu instruksi manual)? Hanya dipanggil di klien. */
function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(window.navigator.userAgent) &&
    !(window.navigator as unknown as { MSStream?: unknown }).MSStream
  );
}

/** Apakah prompt sudah pernah ditutup pengguna? Hanya dipanggil di klien. */
function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const { t } = useLocale();
  const isClient = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);

  // Nilai turunan dari API browser — hanya dievaluasi di sisi klien
  // (di-guard `isClient` agar tidak menyentuh `window` saat SSR).
  const ios = isClient && isIOS();
  const standalone = isClient && isStandaloneMode();
  const alreadyDismissed = dismissed || (isClient && wasDismissed());
  const visible = !standalone && !alreadyDismissed && (!!deferred || ios);

  // Daftarkan listener `beforeinstallprompt`. setState hanya dipanggil di
  // dalam callback event (bukan sinkron di body effect).
  useEffect(() => {
    if (!isClient) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isClient]);

  const handleLater = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (!deferred) {
      handleLater();
      return;
    }
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  if (!visible) return null;
  // Tidak ada prompt natif (non-iOS, non-Chromium) -> jangan tampilkan.
  if (!deferred && !ios) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 pointer-events-none">
      <Card
        size="small"
        className="pointer-events-auto w-full max-w-sm shadow-lg"
        styles={{ body: { padding: 16 } }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-white">
            <MobileOutlined />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug">{t("pwa.installTitle")}</p>
            <p className="text-sm opacity-70">{t("pwa.installDesc")}</p>
            {ios && (
              <p className="mt-1 text-xs opacity-60">{t("pwa.iosHint")}</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button size="small" onClick={handleLater}>
            {t("pwa.laterBtn")}
          </Button>
          {deferred && (
            <Button type="primary" size="small" onClick={handleInstall}>
              {t("pwa.installBtn")}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

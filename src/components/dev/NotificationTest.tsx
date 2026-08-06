"use client";

import {
  SendOutlined,
  MailOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
import { App, Button, Card, Space, Tag, Tooltip } from "antd";
import { useCallback, useState, useSyncExternalStore } from "react";
import { useLocale } from "@/components/locale/LocaleProvider";

/**
 * Panel development untuk mengirim notifikasi manual.
 *
 * Hanya ditampilkan ketika NODE_ENV === "development".
 * Komponen ini muncul sebagai floating card di pojok kanan bawah,
 * mirip InstallPrompt.
 *
 * Tombol memanggil POST langsung ke masing-masing cron route (dev-gated):
 * - "Daily Reminder" → POST /api/cron/daily-reminder (push)
 * - "Weekly Summary" → POST /api/cron/weekly-summary (email)
 */

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const IS_DEV =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

type LoadingKey = "daily" | "weekly";

export default function NotificationTest() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const { t } = useLocale();
  const { message } = App.useApp();

  const [loading, setLoading] = useState<Record<LoadingKey, boolean>>({
    daily: false,
    weekly: false,
  });
  const [visible, setVisible] = useState(true);

  const isDev = IS_DEV && isClient;

  const callDev = useCallback(
    async (key: LoadingKey, url: string) => {
      setLoading((prev) => ({ ...prev, [key]: true }));
      try {
        const res = await fetch(url, { method: "POST" });
        const data = await res.json();
        if (res.ok && data.success) {
          message.success(
            data.message ??
              t("dev.pushSuccess", { val: String(data.sent ?? 0) }),
          );
        } else {
          message.error(data.error ?? t("dev.pushFailed"));
        }
      } catch {
        message.error(t("dev.pushFailed"));
      } finally {
        setLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [t, message],
  );

  if (!isDev || !visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
      <Card
        size="small"
        className="pointer-events-auto w-full max-w-xs shadow-lg"
        styles={{ body: { padding: 12 } }}
        title={
          <div className="flex items-center gap-2">
            <ExperimentOutlined className="text-indigo-500" />
            <span className="text-xs font-semibold">{t("dev.title")}</span>
            <Tag color="orange" className="ml-auto! mr-0!">
              DEV
            </Tag>
          </div>
        }
      >
        <Space direction="vertical" size={8} className="w-full">
          <Tooltip title={t("dev.dailyTooltip")}>
            <Button
              size="small"
              icon={<SendOutlined />}
              loading={loading.daily}
              onClick={() => callDev("daily", "/api/cron/daily-reminder")}
              block
            >
              {t("dev.dailyBtn")}
            </Button>
          </Tooltip>
          <Tooltip title={t("dev.weeklyTooltip")}>
            <Button
              size="small"
              icon={<MailOutlined />}
              loading={loading.weekly}
              onClick={() => callDev("weekly", "/api/cron/weekly-summary")}
              block
            >
              {t("dev.weeklyBtn")}
            </Button>
          </Tooltip>
        </Space>
        <div className="mt-2 flex justify-end">
          <Button
            type="text"
            size="small"
            onClick={() => setVisible(false)}
            className="text-xs opacity-50"
          >
            {t("common.close")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

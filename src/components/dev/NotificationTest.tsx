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
 * - Push notifications: tracking-nudge, category-spotlight, cycle-reset
 * - Email notifications: new-cycle-kickoff, monthly-summary, csv-export-reminder, quarterly-trend
 */

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const IS_DEV =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

/** Kunci unik untuk setiap tombol notifikasi. */
type NotifKey =
  | "tracking-nudge"
  | "category-spotlight"
  | "cycle-reset"
  | "new-cycle-kickoff"
  | "monthly-summary"
  | "csv-export-reminder"
  | "quarterly-trend";

/** Channel per notifikasi: push = Web Push, email = Email. */
const NOTIF_CHANNELS: Record<NotifKey, "push" | "email"> = {
  "tracking-nudge": "push",
  "category-spotlight": "push",
  "cycle-reset": "push",
  "new-cycle-kickoff": "email",
  "monthly-summary": "email",
  "csv-export-reminder": "email",
  "quarterly-trend": "email",
};

export default function NotificationTest() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const { t } = useLocale();
  const { message } = App.useApp();

  const [loading, setLoading] = useState<Record<NotifKey, boolean>>({
    "tracking-nudge": false,
    "category-spotlight": false,
    "cycle-reset": false,
    "new-cycle-kickoff": false,
    "monthly-summary": false,
    "csv-export-reminder": false,
    "quarterly-trend": false,
  });
  const [visible, setVisible] = useState(true);

  const isDev = IS_DEV && isClient;

  const callDev = useCallback(
    async (key: NotifKey, url: string) => {
      setLoading((prev) => ({ ...prev, [key]: true }));
      try {
        const res = await fetch(url, { method: "POST" });
        const data = await res.json();
        if (res.ok && data.success) {
          const channel = NOTIF_CHANNELS[key];
          if (channel === "email") {
            message.success(data.message ?? t("dev.emailSuccess"));
          } else {
            message.success(
              data.message ??
                t("dev.pushSuccess", { val: String(data.sent ?? 0) }),
            );
          }
        } else if (data.skipped) {
          message.info(data.message ?? t("dev.skipped"));
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

  /** Daftar tombol: kunci notifikasi + kunci terjemahan. */
  const buttons: {
    key: NotifKey;
    path: string;
    labelKey: string;
    tooltipKey: string;
    icon: typeof SendOutlined;
  }[] = [
    {
      key: "tracking-nudge",
      path: "/api/cron/tracking-nudge",
      labelKey: "dev.trackingNudgeBtn",
      tooltipKey: "dev.trackingNudgeTooltip",
      icon: SendOutlined,
    },
    {
      key: "category-spotlight",
      path: "/api/cron/category-spotlight",
      labelKey: "dev.categorySpotlightBtn",
      tooltipKey: "dev.categorySpotlightTooltip",
      icon: SendOutlined,
    },
    {
      key: "cycle-reset",
      path: "/api/cron/cycle-reset",
      labelKey: "dev.cycleResetBtn",
      tooltipKey: "dev.cycleResetTooltip",
      icon: SendOutlined,
    },
    {
      key: "new-cycle-kickoff",
      path: "/api/cron/new-cycle-kickoff",
      labelKey: "dev.newCycleKickoffBtn",
      tooltipKey: "dev.newCycleKickoffTooltip",
      icon: MailOutlined,
    },
    {
      key: "monthly-summary",
      path: "/api/cron/monthly-summary",
      labelKey: "dev.monthlySummaryBtn",
      tooltipKey: "dev.monthlySummaryTooltip",
      icon: MailOutlined,
    },
    {
      key: "csv-export-reminder",
      path: "/api/cron/csv-export-reminder",
      labelKey: "dev.csvExportBtn",
      tooltipKey: "dev.csvExportTooltip",
      icon: MailOutlined,
    },
    {
      key: "quarterly-trend",
      path: "/api/cron/quarterly-trend",
      labelKey: "dev.quarterlyTrendBtn",
      tooltipKey: "dev.quarterlyTrendTooltip",
      icon: MailOutlined,
    },
  ];

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
          {buttons.map((btn) => {
            const Icon = btn.icon;
            return (
              <Tooltip title={t(btn.tooltipKey)} key={btn.key}>
                <Button
                  size="small"
                  icon={<Icon />}
                  loading={loading[btn.key]}
                  onClick={() => callDev(btn.key, btn.path)}
                  block
                >
                  {t(btn.labelKey)}
                </Button>
              </Tooltip>
            );
          })}
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

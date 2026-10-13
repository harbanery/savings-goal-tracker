"use client";

import { BulbFilled, BulbOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useThemeMode } from "./ThemeProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { trackEvent } from "@/components/ui/vercel/track";

/** Tombol toggle dark/light mode. */
export default function ThemeToggle() {
  const { mode, hydrated, toggle } = useThemeMode();
  const { t } = useLocale();
  // Selama hidrasi, render berdasarkan mode "light" (default server) agar
  // konsisten dengan HTML yang di-render server.
  const isDark = hydrated && mode === "dark";

  function handleToggle() {
    trackEvent("theme_toggled", { mode: isDark ? "light" : "dark" });
    toggle();
  }

  return (
    <Tooltip title={isDark ? t("theme.light") : t("theme.dark")}>
      <Button
        type="default"
        shape="circle"
        icon={isDark ? <BulbFilled /> : <BulbOutlined />}
        onClick={handleToggle}
        aria-label={isDark ? t("theme.enableLight") : t("theme.enableDark")}
        suppressHydrationWarning
      />
    </Tooltip>
  );
}

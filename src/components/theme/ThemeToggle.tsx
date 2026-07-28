"use client";

import { BulbFilled, BulbOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useThemeMode } from "./ThemeProvider";

/** Tombol toggle dark/light mode. */
export default function ThemeToggle() {
  const { mode, hydrated, toggle } = useThemeMode();
  // Selama hidrasi, render berdasarkan mode "light" (default server) agar
  // konsisten dengan HTML yang di-render server.
  const isDark = hydrated && mode === "dark";

  return (
    <Tooltip title={isDark ? "Mode Terang" : "Mode Gelap"}>
      <Button
        type="default"
        icon={isDark ? <BulbFilled /> : <BulbOutlined />}
        onClick={toggle}
        aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
        suppressHydrationWarning
      />
    </Tooltip>
  );
}

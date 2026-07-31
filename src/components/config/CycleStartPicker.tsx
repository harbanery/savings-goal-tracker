"use client";

import { CalendarOutlined } from "@ant-design/icons";
import { Button, Dropdown, Tooltip, type MenuProps } from "antd";
import { useCycleConfig } from "./CycleConfigProvider";

const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

/** Tombol untuk memilih tanggal mulai siklus (1-28). */
export default function CycleStartPicker() {
  const { startDay, setStartDay, hydrated } = useCycleConfig();

  const items: MenuProps["items"] = DAY_OPTIONS.map((d) => ({
    key: String(d),
    label: String(d),
    onClick: () => setStartDay(d),
  }));

  // Render label default (25) sebelum hidrasi agar konsisten dengan server.
  const label = hydrated ? String(startDay) : "25";

  return (
    <Dropdown menu={{ items }} placement="bottomRight">
      <Tooltip title="Tanggal mulai siklus">
        <Button
          type={startDay === 25 ? "default" : "primary"}
          icon={<CalendarOutlined />}
        >
          <span className="hidden md:inline">{label}</span>
        </Button>
      </Tooltip>
    </Dropdown>
  );
}

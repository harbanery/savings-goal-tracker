"use client";

import { CalendarOutlined } from "@ant-design/icons";
import { Button, DatePicker } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { useCycle } from "@/features/web/hooks/cycle";
import {
  formatCycleLabel,
  formatDateLabel,
  getCycleForDate,
  getCycleInfo,
} from "@/features/web/utils/cycle";
import RealtimeClock from "./RealtimeClock";

/**
 * Kapsul tanggal/siklus + jam realtime (satu komponen, border round).
 *
 * Input DatePicker di-hide; card (popup) pemilih bulan tetap muncul saat
 * kapsul diklik (prop `open` dikontrol penuh). Bagian kiri menggantikan
 * input DatePicker:
 * - datepicker "kosong" (masih siklus berjalan) → tanggal hari ini,
 *   mis. "20 Oktober 2026";
 * - datepicker diisi bulannya → bulan + tahun siklus terpilih saja.
 *
 * Bagian kanan:
 * - datepicker kosong → jam realtime biasa (klik jam membuka popup);
 * - bulan terisi → tombol "Hari Ini" untuk kembali ke siklus berjalan.
 */
export default function CycleClockPicker({
  hideClock = false,
}: {
  /** Mobile: tanpa jam/tombol Hari Ini (hanya label + popup). */
  hideClock?: boolean;
}) {
  const { t, locale } = useLocale();
  const { cycle, setCycle, startDay } = useCycle();
  const [open, setOpen] = useState(false);
  /** true hanya bila popup dibuka lewat klik kapsul (state aktif). */
  const [clockActive, setClockActive] = useState(false);
  /** Waktu klien dibaca setelah mount agar SSR/hidrasi konsisten. */
  const [nowTs, setNowTs] = useState<number | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setNowTs(Date.now());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const now = nowTs === null ? null : new Date(nowTs);
  /** Datepicker "kosong" = siklus aktif masih siklus berjalan (hari ini). */
  const isCurrentCycle =
    now === null || cycle.key === getCycleForDate(now, startDay).key;

  const leftLabel = !isCurrentCycle
    ? formatCycleLabel(cycle.year, cycle.monthIndex, locale)
    : now
      ? formatDateLabel(now, locale)
      : t("clock.loading");

  /** Popup tertutup → reset state aktif kapsul. */
  function handleOpenChange(next: boolean): void {
    setOpen(next);
    if (!next) setClockActive(false);
  }

  function openPicker(): void {
    setOpen(true);
    setClockActive(true);
  }

  return (
    <div
      className={`relative flex items-center rounded-full border transition-colors ${
        clockActive
          ? "border-indigo-600 ring-2 ring-indigo-600/20 dark:border-indigo-400 dark:ring-indigo-400/20"
          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
      } ${hideClock ? "" : "px-3"}`}
    >
      {/* DatePicker tersembunyi — hanya sebagai anchor popup; buka/tutup
          sepenuhnya dikendalikan tombol label di kapsul (open controlled). */}
      <DatePicker
        className="pointer-events-none absolute left-0 top-0 h-px! w-px! overflow-hidden! p-0! opacity-0!"
        picker="month"
        size="small"
        allowClear={false}
        variant="borderless"
        format="MMMM YYYY"
        open={open}
        onOpenChange={handleOpenChange}
        value={dayjs().year(cycle.year).month(cycle.monthIndex)}
        onChange={(date) => {
          if (date) {
            setCycle(getCycleInfo(date.year(), date.month(), startDay));
          }
          setOpen(false);
          setClockActive(false);
        }}
        tabIndex={-1}
        aria-hidden
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label={t("app.cyclePicker")}
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-1.5 py-1 font-mono text-xs font-semibold"
      >
        <span className="tabular-nums">{leftLabel}</span>
      </button>
      {!hideClock && (
        <>
          <span
            aria-hidden
            className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700"
          />
          {isCurrentCycle ? (
            // Jam realtime — klik membuka popup pemilih siklus dan
            // menampilkan state aktif pada kapsul.
            <button
              type="button"
              onClick={openPicker}
              aria-label={t("app.cyclePicker")}
              className="mr-1 flex cursor-pointer items-center"
            >
              <RealtimeClock />
            </button>
          ) : (
            // Bulan terisi — jam digantikan tombol kembali ke hari ini
            // (siklus berjalan).
            <Button
              type="text"
              size="small"
              className="font-mono! text-xs! font-semibold!"
              onClick={() => setCycle(getCycleForDate(new Date(), startDay))}
              aria-label={t("app.todayAria")}
            >
              {t("app.today")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

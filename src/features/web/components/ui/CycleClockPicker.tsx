"use client";

import { CalendarOutlined } from "@ant-design/icons";
import { Button, DatePicker } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { useCycle } from "@/features/web/hooks/cycle";
import { getCycleForDate, getCycleInfo } from "@/features/web/utils/cycle";
import RealtimeClock from "./RealtimeClock";

/**
 * Kapsul pemilih siklus + jam realtime (satu komponen, border round):
 * [ DatePicker pemilih siklus | jam realtime ].
 *
 * - Family, weight & ukuran font DatePicker sama dengan jam realtime
 *   (mono, semibold, text-xs).
 * - Border focus/active transparan saat DatePicker diklik langsung;
 *   state aktif kapsul hanya ditampilkan saat JAM yang diklik
 *   (klik jam juga membuka popup DatePicker).
 * - Saat siklus yang dipilih bukan bulan ini, jam realtime berubah
 *   menjadi tombol "Bulan ini" untuk kembali ke siklus berjalan.
 */
export default function CycleClockPicker({
  hideClock = false,
}: {
  /** Mobile: hanya DatePicker (tanpa jam/tombol Bulan ini). */
  hideClock?: boolean;
}) {
  const { t } = useLocale();
  const { cycle, setCycle, startDay } = useCycle();
  const [open, setOpen] = useState(false);
  /** true hanya bila popup dibuka lewat klik jam (bukan klik picker). */
  const [clockActive, setClockActive] = useState(false);

  const isCurrentCycle =
    cycle.key === getCycleForDate(new Date(), startDay).key;

  /** Popup tertutup → reset state aktif kapsul. */
  function handleOpenChange(next: boolean): void {
    setOpen(next);
    if (!next) setClockActive(false);
  }

  return (
    <div
      className={`flex items-center rounded-full border transition-colors ${
        clockActive
          ? "border-indigo-600 ring-2 ring-indigo-600/20 dark:border-indigo-400 dark:ring-indigo-400/20"
          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
      } ${hideClock ? "pr-0.5" : "pl-1 pr-3"}`}
    >
      <DatePicker
        className="font-mono! border-transparent! text-xs! font-semibold! [&_input]:font-mono! [&_input]:text-xs! [&_input]:font-semibold!"
        picker="month"
        size="small"
        allowClear={false}
        variant="borderless"
        format="MMMM YYYY"
        value={dayjs().year(cycle.year).month(cycle.monthIndex)}
        onChange={(date) => {
          if (date) {
            setCycle(getCycleInfo(date.year(), date.month(), startDay));
          }
        }}
        {...(hideClock ? {} : { open, onOpenChange: handleOpenChange })}
        aria-label={t("app.cyclePicker")}
      />
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
              onClick={() => {
                setOpen(true);
                setClockActive(true);
              }}
              aria-label={t("app.cyclePicker")}
              className="flex cursor-pointer items-center mx-3"
            >
              <RealtimeClock />
            </button>
          ) : (
            // Bukan bulan ini — jam digantikan tombol kembali ke siklus
            // berjalan.
            <Button
              type="text"
              size="small"
              className="font-mono! text-xs! font-semibold!"
              onClick={() => setCycle(getCycleForDate(new Date(), startDay))}
              aria-label={t("app.currentMonthAria")}
            >
              {t("app.currentMonth")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

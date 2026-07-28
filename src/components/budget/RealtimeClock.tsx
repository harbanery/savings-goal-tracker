"use client";

import { ClockCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

/**
 * Jam realtime yang diperbarui setiap detik menggunakan `setTimeout` rekursif.
 * `now` dimulai dari `null` pada render server/awal client agar placeholder
 * konsisten dan tidak memicu hydration mismatch.
 */
export default function RealtimeClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (!active) return;
      const current = new Date();
      setNow(current);
      const delay = 1000 - current.getMilliseconds();
      timeoutId = setTimeout(tick, delay);
    };

    timeoutId = setTimeout(tick, 0);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const time = now ? dayjs(now).format("HH:mm:ss") : "--:--:--";
  const date = now ? dayjs(now).format("ddd, D MMM YYYY") : "Memuat...";

  return (
    <output
      className="flex select-none items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-800"
      aria-label={`Waktu sekarang ${time}, ${date}`}
    >
      <ClockCircleOutlined className="text-indigo-500" />
      <div className="flex h-10 flex-col justify-center leading-tight">
        <span className="font-mono text-sm font-semibold tabular-nums">
          {time}
        </span>
        <span className="hidden text-[11px] text-zinc-500 dark:text-zinc-400 sm:block">
          {date}
        </span>
      </div>
    </output>
  );
}

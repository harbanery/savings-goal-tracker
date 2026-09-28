"use client";

import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";

/**
 * Jam realtime (hanya waktu) yang diperbarui setiap detik dengan
 * `setTimeout` rekursif. `now` dimulai null di server agar placeholder
 * konsisten dan tidak memicu hydration mismatch.
 */
export default function RealtimeClock() {
  const [now, setNow] = useState<Date | null>(null);
  const { t } = useLocale();

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
  const date = now ? dayjs(now).format("ddd, D MMM YYYY") : t("clock.loading");

  return (
    <output
      aria-label={t("clock.ariaTime", { time, date })}
      className="flex select-none items-center rounded-full border border-zinc-200 px-3 py-1 font-mono text-xs font-semibold tabular-nums dark:border-zinc-700"
      style={{ lineHeight: "22px" }}
    >
      {time}
    </output>
  );
}

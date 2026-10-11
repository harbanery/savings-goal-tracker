"use client";

import { Empty, Typography } from "antd";
import { useMemo } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { CategoryStat } from "@/features/web/utils/stats";
import { formatIDR } from "@/utils/helpers";

const { Text } = Typography;

interface Props {
  /** Stat per kategori siklus aktif (dari computeCycleStats). */
  categories: CategoryStat[];
  /** Jumlah kategori teratas yang ditampilkan. */
  topN?: number;
}

/**
 * Daftar rincian pengeluaran per kategori sesuai referensi
 * Dashboard Content.svg: baris ikon warna + nama kategori + jumlah
 * transaksi, bar tipis proporsi, dan nilai ter-align kanan.
 */
export default function CategoryBreakdownList({
  categories,
  topN = 5,
}: Readonly<Props>) {
  const { t, locale } = useLocale();

  const rows = useMemo(
    () =>
      [...categories]
        .filter((c) => c.spent > 0)
        .sort((a, b) => b.spent - a.spent)
        .slice(0, topN),
    [categories, topN],
  );

  const maxSpent = rows[0]?.spent ?? 0;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <Text strong>{t("chart.categoryTitle")}</Text>
        {rows.length > 0 && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("chart.topCategories", { n: rows.length })}
          </Text>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <Empty description={t("chart.emptySpending")} />
        </div>
      ) : (
        <ul className="m-0 flex-1 list-none space-y-1 p-0">
          {rows.map((cat) => {
            const share =
              maxSpent > 0 ? Math.round((cat.spent / maxSpent) * 100) : 0;
            return (
              <li
                key={cat.categoryId}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.color }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <Text ellipsis className="min-w-0 text-sm">
                      {cat.name}
                    </Text>
                    <Text
                      strong
                      className="shrink-0 text-sm tabular-nums"
                    >
                      {formatIDR(cat.spent, locale)}
                    </Text>
                  </div>
                  {/* Bar tipis proporsi relatif kategori teratas + jumlah
                      transaksi (selaras pola referensi). */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${share}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                    <Text
                      type="secondary"
                      style={{ fontSize: 11 }}
                      className="shrink-0"
                    >
                      {cat.transactionCount}x
                    </Text>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

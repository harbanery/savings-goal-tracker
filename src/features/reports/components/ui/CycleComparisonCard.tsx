"use client";

import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { Card, Empty, Tag, Typography } from "antd";
import { useMemo } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { compareCyclesByCategory } from "@/features/reports/utils/reportStats";
import type {
  BudgetCategory,
  Transaction,
} from "@/features/web/types";
import {
  formatCycleLabel,
  shiftCycle,
  type CycleInfo,
} from "@/features/web/utils/cycle";
import { formatIDR } from "@/utils/helpers";

const { Text } = Typography;

interface Props {
  /** Transaksi siklus aktif (dipilih lewat DatePicker month di navbar). */
  current: Transaction[];
  /** Transaksi satu siklus sebelum siklus aktif. */
  previous: Transaction[];
  categories: BudgetCategory[];
  cycle: CycleInfo;
}

/** Tag perubahan: naik merah (boros), turun hijau (hemat), baru biru. */
function DeltaTag({
  pct,
  isNew,
  labelFlat,
  labelNew,
}: {
  pct: number | null;
  isNew: boolean;
  labelFlat: string;
  labelNew: string;
}) {
  if (isNew) {
    return (
      <Tag color="blue" className="m-0!">
        {labelNew}
      </Tag>
    );
  }
  if (pct === null || pct === 0) {
    return (
      <Text type="secondary" className="text-xs!">
        {labelFlat}
      </Text>
    );
  }
  const up = pct > 0;
  return (
    <Tag color={up ? "red" : "green"} className="m-0!">
      {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(pct)}%
    </Tag>
  );
}

/**
 * Perbandingan siklus (rekomendasi D7 — P2): pengeluaran per wadah
 * siklus aktif vs siklus sebelumnya, lengkap dengan persentase
 * naik/turun dan baris total.
 */
export default function CycleComparisonCard({
  current,
  previous,
  categories,
  cycle,
}: Readonly<Props>) {
  const { t, locale } = useLocale();

  const comparison = useMemo(
    () => compareCyclesByCategory(current, previous, categories),
    [current, previous, categories],
  );

  const prevCycle = useMemo(() => shiftCycle(cycle, -1), [cycle]);
  const currentLabel = formatCycleLabel(cycle.year, cycle.monthIndex, locale);
  const prevLabel = formatCycleLabel(
    prevCycle.year,
    prevCycle.monthIndex,
    locale,
  );

  const empty =
    comparison.rows.length === 0 ||
    (comparison.total.current === 0 && comparison.total.previous === 0);

  return (
    <Card
      variant="borderless"
      className="shadow-sm!"
      size="small"
      title={<Text strong>{t("reports.comparisonTitle")}</Text>}
      styles={{ body: { padding: 0 } }}
    >
      <div className="px-3 pt-2 pb-1">
        <Text type="secondary" className="text-[11px]!">
          {t("reports.comparisonDesc", {
            current: currentLabel,
            previous: prevLabel,
          })}
        </Text>
      </div>
      {empty ? (
        <div className="flex h-[160px] items-center justify-center">
          <Empty description={t("reports.comparisonEmpty")} />
        </div>
      ) : (
        comparison.rows.map((row) => (
          <div
            key={row.categoryId}
            className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 last:border-b-0 dark:border-zinc-800"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
              aria-hidden="true"
            />
            <Text strong ellipsis className="min-w-0 flex-1! text-sm!">
              {row.name}
            </Text>
            <div className="flex flex-col items-end">
              <Text strong className="text-sm!">
                {formatIDR(row.current, locale)}
              </Text>
              <Text type="secondary" className="text-[11px]!">
                {t("reports.comparisonVs", {
                  amount: formatIDR(row.previous, locale),
                })}
              </Text>
            </div>
            <DeltaTag
              pct={row.pct}
              isNew={row.isNew}
              labelFlat={t("reports.comparisonFlat")}
              labelNew={t("reports.comparisonNew")}
            />
          </div>
        ))
      )}
      {!empty && (
        <div className="flex items-center gap-2 border-t border-zinc-200 px-3 py-2 dark:border-zinc-700">
          <Text strong className="min-w-0 flex-1! text-sm!">
            {t("reports.comparisonTotal")}
          </Text>
          <div className="flex flex-col items-end">
            <Text strong className="text-sm!">
              {formatIDR(comparison.total.current, locale)}
            </Text>
            <Text type="secondary" className="text-[11px]!">
              {t("reports.comparisonVs", {
                amount: formatIDR(comparison.total.previous, locale),
              })}
            </Text>
          </div>
          <DeltaTag
            pct={comparison.total.pct}
            isNew={comparison.total.previous === 0}
            labelFlat={t("reports.comparisonFlat")}
            labelNew={t("reports.comparisonNew")}
          />
        </div>
      )}
    </Card>
  );
}

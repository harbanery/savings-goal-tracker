"use client";

import { Card, Empty, Progress, Typography } from "antd";
import { useMemo } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getQuickInsights } from "@/features/reports/utils/reportStats";
import { formatDateLabel } from "@/features/web/utils/cycle";
import type { Transaction } from "@/features/web/types";
import { formatIDR } from "@/utils/helpers";

const { Text } = Typography;

interface Props {
  transactions: Transaction[];
}

/** Satu kolom insight ringkas: label kecil, nilai besar, keterangan. */
function InsightItem({
  label,
  value,
  desc,
  extra,
}: {
  label: string;
  value: string;
  desc?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-1">
      <Text type="secondary" className="text-xs!">
        {label}
      </Text>
      <Text strong className="text-base! break-words!">
        {value}
      </Text>
      {desc && (
        <Text type="secondary" className="text-[11px]! break-words!">
          {desc}
        </Text>
      )}
      {extra}
    </div>
  );
}

/**
 * Ringkasan cepat (rekomendasi D7): hari paling boros, rata-rata per
 * transaksi, dan rasio pengeluaran tetap (dari aturan berulang) vs
 * variabel — dihitung dari transaksi pada rentang laporan aktif.
 */
export default function QuickInsightsCard({ transactions }: Readonly<Props>) {
  const { t, locale } = useLocale();

  const insights = useMemo(() => getQuickInsights(transactions), [transactions]);

  if (insights.expenseCount === 0) {
    return (
      <Card
        variant="borderless"
        className="shadow-sm!"
        size="small"
        title={<Text strong>{t("reports.quickTitle")}</Text>}
      >
        <div className="flex h-[160px] items-center justify-center">
          <Empty description={t("reports.noExpense")} />
        </div>
      </Card>
    );
  }

  const variablePct = 100 - insights.fixedPct;

  return (
    <Card
      variant="borderless"
      className="shadow-sm!"
      size="small"
      title={<Text strong>{t("reports.quickTitle")}</Text>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-2">
        <InsightItem
          label={t("reports.peakDay")}
          value={formatIDR(insights.peakDay?.total ?? 0, locale)}
          desc={
            insights.peakDay
              ? formatDateLabel(new Date(insights.peakDay.date), locale)
              : undefined
          }
        />
        <InsightItem
          label={t("reports.avgPerTransaction")}
          value={formatIDR(insights.avgPerExpense, locale)}
          desc={t("reports.avgTransactions", { n: insights.expenseCount })}
        />
        <InsightItem
          label={t("reports.fixedVariable")}
          value={t("reports.fixedVariableValue", {
            fixed: insights.fixedPct,
            variable: variablePct,
          })}
          desc={t("reports.fixedVariableDesc", {
            fixed: formatIDR(insights.fixedTotal, locale),
            variable: formatIDR(insights.variableTotal, locale),
          })}
          extra={
            <Progress
              percent={insights.fixedPct}
              showInfo={false}
              size="small"
              aria-label={t("reports.fixedVariable")}
            />
          }
        />
      </div>
    </Card>
  );
}

"use client";

import { Card, Col, Row, Statistic } from "antd";
import type { CycleStats } from "@/features/web/utils/stats";
import { formatIDR } from "@/utils/helpers";
import { useLocale } from "@/components/i18n/LocaleProvider";

interface Props {
  stats: CycleStats;
}

/**
 * Kartu ringkasan dashboard sesuai generate_web.md:
 * Saldo, Pemasukan, Pengeluaran, dan Cash Flow.
 */
export default function StatsCards({ stats }: Readonly<Props>) {
  const { t, locale } = useLocale();

  const cashFlow = stats.totalIncome - stats.totalSpent;
  const contentStyle = {
    fontSize: "clamp(24px, 3vw, 24px)",
  } as const;

  return (
    <Row gutter={[8, 8]} className="mb-4 md:mb-6">
      <Col xs={24} sm={12} lg={6}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title={t("stats.netSavings")}
            value={stats.netSavings}
            formatter={(value) => formatIDR(Number(value), locale)}
            styles={{
              content: {
                color: stats.netSavings >= stats.savingsInitial ? "#16a34a" : "#ef4444",
                ...contentStyle,
              },
            }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title={t("stats.totalIncome")}
            value={stats.totalIncome}
            formatter={(value) => formatIDR(Number(value), locale)}
            styles={{
              content: { color: "#16a34a", ...contentStyle },
            }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title={t("stats.totalSpent")}
            value={stats.totalSpent}
            formatter={(value) => formatIDR(Number(value), locale)}
            styles={{
              content: {
                color: stats.overLimit ? "#ef4444" : "#d97706",
                ...contentStyle,
              },
            }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title={t("stats.cashFlow")}
            value={cashFlow}
            formatter={(value) => formatIDR(Number(value), locale)}
            styles={{
              content: {
                color: cashFlow >= 0 ? "#16a34a" : "#ef4444",
                ...contentStyle,
              },
            }}
          />
        </Card>
      </Col>
    </Row>
  );
}

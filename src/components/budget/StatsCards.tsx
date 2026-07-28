"use client";

import { Card, Col, Progress, Row, Statistic } from "antd";
import type { CycleStats } from "@/helpers/stats";
import { formatIDR } from "@/utils/currency";

interface Props {
  stats: CycleStats;
}

/** Kartu statistik ringkasan siklus. */
export default function StatsCards({ stats }: Props) {
  return (
    <Row gutter={[12, 12]} className="mb-4 md:mb-6">
      <Col xs={12} md={6}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title="Saldo Awal"
            value={stats.savingsInitial}
            formatter={(value) => formatIDR(Number(value))}
            styles={{ content: { color: "#6366f1", fontSize: "clamp(14px, 3.5vw, 24px)" } }}
          />
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title="Total Pengeluaran"
            value={stats.totalSpent}
            formatter={(value) => formatIDR(Number(value))}
            styles={{
              content: { color: stats.overLimit ? "#ef4444" : "#f59e0b", fontSize: "clamp(14px, 3.5vw, 24px)" },
            }}
          />
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title="Sisa Limit"
            value={stats.limitRemaining}
            formatter={(value) => formatIDR(Number(value))}
            styles={{
              content: {
                color: stats.overLimit ? "#ef4444" : "#22c55e",
                fontSize: "clamp(14px, 3.5vw, 24px)",
              },
            }}
          />
          <Progress
            percent={stats.limitPercent}
            showInfo={false}
            size="small"
            strokeColor={stats.overLimit ? "#ef4444" : "#f59e0b"}
          />
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title="Siklus Bulanan"
            value={stats.remaining}
            formatter={(value) => formatIDR(Number(value))}
            styles={{
              content: {
                color: stats.remaining < 0 ? "#ef4444" : "#3b82f6",
                fontSize: "clamp(14px, 3.5vw, 24px)",
              },
            }}
          />
        </Card>
      </Col>
    </Row>
  );
}

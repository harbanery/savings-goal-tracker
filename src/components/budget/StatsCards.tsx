"use client";

import { Card, Col, Progress, Row, Statistic } from "antd";
import type { CycleStats } from "@/helpers/stats";
import { formatIDR } from "@/utils/currency";

interface Props {
  stats: CycleStats;
}

/** Kartu statistik ringkasan siklus (3 kartu). */
export default function StatsCards({ stats }: Props) {
  return (
    <Row gutter={[8, 8]} className="mb-4 md:mb-6">
      <Col xs={24} sm={8}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title="Saldo Awal"
            value={stats.savingsInitial}
            formatter={(value) => formatIDR(Number(value))}
            styles={{
              content: {
                color: "#6366f1",
                fontSize: "clamp(13px, 3vw, 24px)",
              },
            }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title="Total Pengeluaran"
            value={stats.totalSpent}
            formatter={(value) => formatIDR(Number(value))}
            styles={{
              content: {
                color: stats.overLimit ? "#ef4444" : "#f59e0b",
                fontSize: "clamp(13px, 3vw, 24px)",
              },
            }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title="Sisa Limit"
            value={stats.limitRemaining}
            formatter={(value) => formatIDR(Number(value))}
            styles={{
              content: {
                color: stats.overLimit ? "#ef4444" : "#22c55e",
                fontSize: "clamp(13px, 3vw, 24px)",
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
    </Row>
  );
}

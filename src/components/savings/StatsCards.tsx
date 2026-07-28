import { Card, Col, Progress, Row, Statistic } from "antd";
import type { SavingsStats } from "@/helpers/stats";
import { formatIDR } from "@/utils/currency";

interface Props {
  stats: SavingsStats;
}

/** Kartu statistik ringkasan agregat tabungan. */
export default function StatsCards({ stats }: Props) {
  return (
    <Row gutter={[16, 16]} className="mb-6">
      <Col xs={12} md={6}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title="Total Tabungan"
            value={stats.totalSaved}
            formatter={(value) => formatIDR(Number(value))}
            valueStyle={{ color: "#6366f1" }}
          />
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title="Total Target"
            value={stats.totalTarget}
            formatter={(value) => formatIDR(Number(value))}
            valueStyle={{ color: "#3b82f6" }}
          />
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title="Progres Keseluruhan"
            value={stats.overallProgress}
            suffix="%"
            valueStyle={{ color: "#f59e0b" }}
          />
          <Progress
            percent={stats.overallProgress}
            showInfo={false}
            size="small"
            strokeColor="#f59e0b"
          />
        </Card>
      </Col>
      <Col xs={12} md={6}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title="Target Tercapai"
            value={stats.completedGoals}
            suffix={`/ ${stats.goalsCount}`}
            valueStyle={{ color: "#22c55e" }}
          />
        </Card>
      </Col>
    </Row>
  );
}

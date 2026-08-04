"use client";

import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { Button, Card, Col, Progress, Row, Statistic } from "antd";
import { useState } from "react";
import type { CycleStats } from "@/helpers/stats";
import { formatIDR } from "@/utils/currency";
import { useLocale } from "@/components/locale/LocaleProvider";

interface Props {
  stats: CycleStats;
}

/** Kartu statistik ringkasan siklus (3 kartu). */
export default function StatsCards({ stats }: Readonly<Props>) {
  const [saldoHidden, setSaldoHidden] = useState(true);
  const { t, locale } = useLocale();

  return (
    <Row gutter={[8, 8]} className="mb-4 md:mb-6">
      <Col xs={24} sm={8}>
        <Card variant="borderless" className="shadow-sm">
          <div className="flex justify-between items-center">
            <Statistic
              title={t("stats.initialBalance")}
              value={saldoHidden ? "••••••" : stats.savingsInitial}
              formatter={(value) =>
                saldoHidden ? value : formatIDR(Number(value), locale)
              }
              styles={{
                content: {
                  color: "#4f46e5",
                  fontSize: "clamp(24px, 3vw, 24px)",
                },
              }}
            />
            <Button
              type="text"
              size="small"
              icon={saldoHidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => setSaldoHidden((v) => !v)}
            />
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title={t("stats.totalSpent")}
            value={stats.totalSpent}
            formatter={(value) => formatIDR(Number(value), locale)}
            styles={{
              content: {
                color: stats.overLimit ? "#ef4444" : "#d97706",
                fontSize: "clamp(24px, 3vw, 24px)",
              },
            }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title={t("stats.limitRemaining")}
            value={stats.limitRemaining}
            formatter={(value) => formatIDR(Number(value), locale)}
            styles={{
              content: {
                color: stats.overLimit ? "#ef4444" : "#16a34a",
                fontSize: "clamp(24px, 3vw, 24px)",
              },
            }}
          />
          <Progress
            percent={stats.limitPercent}
            showInfo={false}
            size="small"
            aria-label={t("stats.limitRemaining")}
            strokeColor={stats.overLimit ? "#ef4444" : "#d97706"}
          />
        </Card>
      </Col>
    </Row>
  );
}

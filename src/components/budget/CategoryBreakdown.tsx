"use client";

import { Card, Col, Progress, Row, Typography } from "antd";
import type { CycleStats } from "@/helpers/stats";
import { formatIDR } from "@/utils/currency";

const { Text } = Typography;

interface Props {
  stats: CycleStats;
}

/** Breakdown per kategori/wadah dengan alokasi, terpakai, dan sisa. */
export default function CategoryBreakdown({ stats }: Props) {
  return (
    <Card
      variant="borderless"
      className="shadow-sm"
      style={{ height: "100%" }}
      size="small"
      title={<Text strong>Alokasi Wadah</Text>}
    >
      <Row gutter={[16, 12]}>
        {stats.categories.map((cat) => {
          const overBudget = cat.spent > cat.allocation;
          return (
            <Col key={cat.categoryId} xs={24} sm={12} lg={8}>
              <div className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-700/60">
                <div className="mb-1 flex items-center gap-2">
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: cat.color,
                      flexShrink: 0,
                    }}
                  />
                  <Text strong style={{ color: cat.color, fontSize: 13 }}>
                    {cat.label}
                  </Text>
                </div>
                <Text
                  type="secondary"
                  style={{ fontSize: 11 }}
                  className="block"
                >
                  {cat.description}
                </Text>
                <div className="mt-2">
                  <Progress
                    percent={cat.percent}
                    size="small"
                    showInfo={false}
                    strokeColor={overBudget ? "#ef4444" : cat.color}
                  />
                  <div className="flex items-center justify-between">
                    <Text style={{ fontSize: 12 }}>
                      {formatIDR(cat.spent)}
                    </Text>
                    <Text
                      type="secondary"
                      style={{ fontSize: 11 }}
                    >
                      / {formatIDR(cat.allocation)}
                    </Text>
                  </div>
                  <Text
                    style={{
                      fontSize: 12,
                      color: overBudget ? "#ef4444" : cat.color,
                      fontWeight: 600,
                    }}
                  >
                    {overBudget ? "Lebih " : "Sisa "}
                    {formatIDR(Math.abs(cat.remaining))}
                    {cat.purchaseCount > 0 && ` (${cat.purchaseCount}x)`}
                  </Text>
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
}

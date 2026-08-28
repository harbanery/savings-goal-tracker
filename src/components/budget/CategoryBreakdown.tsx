"use client";

import { Card, Col, Progress, Row, Typography } from "antd";
import type { CycleStats } from "@/helpers/stats";
import { formatIDR } from "@/utils/currency";
import { useLocale } from "@/components/locale/LocaleProvider";
import { pickText } from "@/components/locale/useTranslatedData";

const { Text } = Typography;

interface Props {
  stats: CycleStats;
}

/** Breakdown per kategori/wadah dengan alokasi, terpakai, dan sisa. */
export default function CategoryBreakdown({ stats }: Props) {
  const { t, locale } = useLocale();
  return (
    <Card
      variant="borderless"
      className="shadow-sm"
      style={{ height: "100%" }}
      size="small"
      title={<Text strong>{t("breakdown.title")}</Text>}
    >
      <Row gutter={{ xs: 12, sm: 16, lg: 16 }} className="[row-gap:8px] sm:[row-gap:12px]">
        {stats.categories.map((cat) => {
          const overBudget = cat.allocation > 0 && cat.spent > cat.allocation;
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
                    {pickText(cat.label, locale)}
                  </Text>
                </div>
                <Text
                  type="secondary"
                  style={{ fontSize: 11 }}
                  className="block"
                >
                  {pickText(cat.description, locale)}
                </Text>
                <div className="mt-2">
                  {cat.excludeFromAllocation ? (
                    <>
                      <Text style={{ fontSize: 12 }}>
                        {formatIDR(cat.spent, locale)}
                      </Text>
                      <Text
                        type="secondary"
                        style={{ fontSize: 11 }}
                        className="ml-2"
                      >
                        {t("breakdown.noAllocation")}
                      </Text>
                      {cat.purchaseCount > 0 && (
                        <Text
                          style={{ fontSize: 11, color: cat.color }}
                          className="block"
                        >
                          {t("breakdown.purchases", { n: cat.purchaseCount })}
                        </Text>
                      )}
                    </>
                  ) : (
                    <>
                      <Progress
                        percent={cat.percent}
                        size="small"
                        showInfo={false}
                        aria-label={pickText(cat.label, locale)}
                        strokeColor={overBudget ? "#ef4444" : cat.color}
                      />
                      <div className="flex items-center justify-between">
                        <Text style={{ fontSize: 12 }}>
                          {formatIDR(cat.spent, locale)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          / {formatIDR(cat.allocation, locale)}
                        </Text>
                      </div>
                      <Text
                        style={{
                          fontSize: 12,
                          color: overBudget ? "#ef4444" : cat.color,
                          fontWeight: 600,
                        }}
                      >
                        {overBudget
                          ? t("breakdown.over")
                          : t("breakdown.remaining")}
                        {formatIDR(Math.abs(cat.remaining), locale)}
                        {cat.purchaseCount > 0 &&
                          ` (${cat.purchaseCount}x)`}
                      </Text>
                      {/* Rincian per subkategori (wadah tanpa subkategori
                          menampilkan total kategori saja). */}
                      {cat.subcategories.length > 0 && cat.spent > 0 && (
                        <div className="mt-1.5 space-y-0.5 border-t border-zinc-100 pt-1.5 dark:border-zinc-700/60">
                          {cat.subcategories
                            .filter((s) => s.purchaseCount > 0)
                            .sort((a, b) => b.spent - a.spent)
                            .map((s) => (
                              <div
                                key={s.subcategoryId}
                                className="flex items-center justify-between gap-2"
                              >
                                <Text
                                  type="secondary"
                                  style={{ fontSize: 11 }}
                                  className="truncate"
                                >
                                  {pickText(s.label, locale)}
                                  <span className="ml-1 opacity-70">
                                    ({s.purchaseCount}x · {s.share}%)
                                  </span>
                                </Text>
                                <Text
                                  style={{ fontSize: 11, flexShrink: 0 }}
                                >
                                  {formatIDR(s.spent, locale)}
                                </Text>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
}

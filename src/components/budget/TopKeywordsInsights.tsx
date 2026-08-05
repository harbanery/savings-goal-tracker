"use client";

import { Card, Empty, Tag, Tooltip, Typography } from "antd";
import { useMemo } from "react";
import { useLocale } from "@/components/locale/LocaleProvider";
import { pickText } from "@/components/locale/useTranslatedData";
import { getTopKeywords, hasKeywordData } from "@/helpers/keywordStats";
import { CATEGORY_MAP } from "@/models/categories";
import type { Purchase } from "@/models/types";
import { formatIDR } from "@/utils/currency";

const { Text } = Typography;

interface Props {
  purchases: Purchase[];
}

/**
 * Menampilkan Top 10 keyword (nama pembelian paling sering muncul)
 * beserta wadah alokasinya. Pola serupa dengan TopTasksInsights
 * di progress-self.
 */
export default function TopKeywordsInsights({ purchases }: Props) {
  const { t, locale } = useLocale();

  const keywords = useMemo(
    () => getTopKeywords(purchases, 10),
    [purchases],
  );

  const valid = hasKeywordData(purchases);

  if (!valid) {
    return (
      <Card
        variant="borderless"
        className="shadow-sm"
        size="small"
        title={<Text strong>{t("insights.topKeywordsTitle")}</Text>}
      >
        <div className="flex h-[200px] items-center justify-center">
          <Empty description={t("insights.empty")} />
        </div>
      </Card>
    );
  }

  return (
    <Card
      variant="borderless"
      className="shadow-sm"
      size="small"
      title={<Text strong>{t("insights.topKeywordsTitle")}</Text>}
      styles={{ body: { padding: 0 } }}
    >
      {keywords.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center">
          <Empty description={t("insights.empty")} />
        </div>
      ) : (
        keywords.map((stat, idx) => {
          // Semua tag kategori untuk keyword ini.
          const categoryTags = stat.categoryIds.map((catId) => {
            const cat = CATEGORY_MAP[catId];
            const label = cat
              ? pickText(cat.label, locale)
              : catId;
            const color = cat?.color ?? "#8b5cf6";
            return (
              <Tag
                key={catId}
                color={color}
                className="!m-0 !text-[10px] !leading-4"
                style={{ borderColor: `${color}40` }}
                variant="solid"
              >
                {label}
              </Tag>
            );
          });

          return (
            <div
              key={stat.key}
              className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2 last:border-b-0 dark:border-zinc-800"
            >
              <Text
                strong
                className="!w-5 shrink-0 text-center"
                style={{ color: stat.categoryColor }}
              >
                {idx + 1}
              </Text>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Text className="truncate !text-sm" title={stat.label}>
                    {stat.label}
                  </Text>
                  <Tooltip
                    title={t("insights.wadahTooltip", {
                      n: stat.categoryIds.length,
                    })}
                  >
                    <div className="flex gap-1">{categoryTags}</div>
                  </Tooltip>
                </div>
                <Text type="secondary" className="!text-[11px]">
                  {t("insights.keywordStat", {
                    count: stat.count,
                    total: formatIDR(stat.totalSpent, locale),
                  })}
                </Text>
              </div>
              <Tooltip
                title={t("insights.keywordFreqTooltip", {
                  val: stat.count,
                })}
              >
                <Text code className="!text-xs">
                  {stat.count}x
                </Text>
              </Tooltip>
            </div>
          );
        })
      )}
    </Card>
  );
}

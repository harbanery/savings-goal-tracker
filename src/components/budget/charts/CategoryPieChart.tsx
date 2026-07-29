"use client";

import { Card, Empty, Typography } from "antd";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { useMemo } from "react";
import { useThemeMode } from "@/components/theme/ThemeProvider";
import { useLocale } from "@/components/locale/LocaleProvider";
import { pickText } from "@/components/locale/useTranslatedData";
import { CATEGORIES } from "@/models/categories";
import type { CycleChartData } from "@/helpers/chartData";
import { formatIDR } from "@/utils/currency";

const { Text } = Typography;

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  cycles: CycleChartData[];
}

/**
 * Pie chart: jumlah pengeluaran tiap alokasi/kategori.
 * Mengakumulasi semua bulan yang tersedia.
 */
export default function CategoryPieChart({ cycles }: Props) {
  const { mode } = useThemeMode();
  const { t, locale } = useLocale();
  const isDark = mode === "dark";
  const tickColor = isDark ? "#9ca3af" : "#6b7280";

  const data: ChartData<"pie"> = useMemo(() => {
    const spentMap: Record<string, number> = {};
    for (const c of cycles) {
      for (const [catId, amount] of Object.entries(c.categorySpent)) {
        spentMap[catId] = (spentMap[catId] ?? 0) + amount;
      }
    }
    const activeCats = CATEGORIES.filter((c) => (spentMap[c.id] ?? 0) > 0);
    return {
      labels: activeCats.map((c) => pickText(c.label, locale)),
      datasets: [
        {
          data: activeCats.map((c) => spentMap[c.id] ?? 0),
          backgroundColor: activeCats.map((c) => c.color),
          borderColor: isDark ? "#0a0a0b" : "#ffffff",
          borderWidth: 2,
        },
      ],
    };
  }, [cycles, isDark, locale]);

  const options: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: tickColor,
          font: { size: 10 },
          usePointStyle: true,
          boxWidth: 8,
          padding: 8,
        },
      },
      tooltip: {
        backgroundColor: isDark ? "#1f2937" : "#ffffff",
        titleColor: isDark ? "#f9fafb" : "#111827",
        bodyColor: isDark ? "#e5e7eb" : "#374151",
        borderColor: isDark ? "#374151" : "#e5e7eb",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (item) => {
            const total = (item.dataset.data as number[]).reduce(
              (a, b) => a + Number(b),
              0,
            );
            const val = Number(item.parsed ?? 0);
            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
            return ` ${item.label}: ${formatIDR(val)} (${pct}%)`;
          },
        },
      },
    },
  };

  const isEmpty = cycles.every(
    (c) => Object.values(c.categorySpent).every((v) => v === 0),
  );

  return (
    <Card
      variant="borderless"
      className="shadow-sm"
      style={{ height: "100%" }}
      styles={{ body: { padding: 16, height: "100%" } }}
      size="small"
      title={<Text strong>{t("chart.categoryTitle")}</Text>}
    >
      {isEmpty ? (
        <div className="flex h-[260px] items-center justify-center">
          <Empty description={t("chart.emptySpending")} />
        </div>
      ) : (
        <div className="h-[260px] w-full sm:h-[300px]">
          <Pie data={data} options={options} />
        </div>
      )}
    </Card>
  );
}

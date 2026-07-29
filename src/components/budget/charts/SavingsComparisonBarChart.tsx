"use client";

import { Card, Empty, Typography } from "antd";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { useMemo } from "react";
import { useThemeMode } from "@/components/theme/ThemeProvider";
import { useLocale } from "@/components/locale/LocaleProvider";
import type { CycleChartData } from "@/helpers/chartData";
import { formatIDR } from "@/utils/currency";

const { Text } = Typography;

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface Props {
  cycles: CycleChartData[];
}

/**
 * Bar chart: expected savings vs actual savings per bulan.
 * Expected savings = saldo awal - total alokasi wadah (dari bulan sebelumnya / konsisten).
 */
export default function SavingsComparisonBarChart({ cycles }: Props) {
  const { mode } = useThemeMode();
  const { t } = useLocale();
  const isDark = mode === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const tickColor = isDark ? "#9ca3af" : "#6b7280";

  const data: ChartData<"bar"> = useMemo(() => {
    return {
      labels: cycles.map((c) => c.label),
      datasets: [
        {
          label: t("chart.expectedSavings"),
          data: cycles.map((c) => c.expectedSavings),
          backgroundColor: "#3b82f6",
          borderRadius: 4,
        },
        {
          label: t("chart.actualSavings"),
          data: cycles.map((c) => c.actualSavings),
          backgroundColor: "#22c55e",
          borderRadius: 4,
        },
      ],
    };
  }, [cycles, t]);

  const options: ChartOptions<"bar"> = {
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
        borderColor: gridColor,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (item) =>
            ` ${item.dataset.label}: ${formatIDR(Number(item.parsed.y ?? 0))}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: tickColor, font: { size: 10 } },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: {
          color: tickColor,
          font: { size: 10 },
          callback: (value) => {
            const v = Number(value);
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} jt`;
            if (v >= 1_000) return `${(v / 1_000).toFixed(0)} rb`;
            return String(v);
          },
        },
        border: { display: false },
      },
    },
  };

  const isEmpty = cycles.length === 0;

  return (
    <Card
      variant="borderless"
      className="shadow-sm"
      style={{ height: "100%" }}
      styles={{ body: { padding: 16, height: "100%" } }}
      size="small"
      title={<Text strong>{t("chart.comparisonTitle")}</Text>}
    >
      {isEmpty ? (
        <div className="flex h-[260px] items-center justify-center">
          <Empty description={t("chart.emptyData")} />
        </div>
      ) : (
        <div className="h-[260px] w-full sm:h-[300px]">
          <Bar data={data} options={options} />
        </div>
      )}
    </Card>
  );
}

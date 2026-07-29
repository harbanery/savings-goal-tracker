"use client";

import { Card, Empty, Typography } from "antd";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { useMemo } from "react";
import { useThemeMode } from "@/components/theme/ThemeProvider";
import { useLocale } from "@/components/locale/LocaleProvider";
import { buildCumulativeSavings } from "@/helpers/chartData";
import type { CycleChartData } from "@/helpers/chartData";
import { formatIDR } from "@/utils/currency";

const { Text } = Typography;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

interface Props {
  cycles: CycleChartData[];
}

/**
 * Line chart: cumulative savings expected vs actual dari waktu ke waktu.
 */
export default function CumulativeSavingsLineChart({ cycles }: Props) {
  const { mode } = useThemeMode();
  const { t, locale } = useLocale();
  const isDark = mode === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const tickColor = isDark ? "#9ca3af" : "#6b7280";

  const { labels, expected, actual } = useMemo(
    () => buildCumulativeSavings(cycles),
    [cycles],
  );

  const data: ChartData<"line"> = {
    labels,
    datasets: [
      {
        label: t("chart.expectedCumulative"),
        data: expected,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.1)",
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: "#3b82f6",
        tension: 0.3,
        fill: false,
      },
      {
        label: t("chart.actualCumulative"),
        data: actual,
        borderColor: "#22c55e",
        backgroundColor: (ctx) => {
          const { chart } = ctx;
          const { ctx: canvasCtx, chartArea } = chart;
          if (!chartArea) return "rgba(34,197,94,0.1)";
          const gradient = canvasCtx.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom,
          );
          gradient.addColorStop(0, "rgba(34,197,94,0.3)");
          gradient.addColorStop(1, "rgba(34,197,94,0.02)");
          return gradient;
        },
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: "#22c55e",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
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
            ` ${item.dataset.label}: ${formatIDR(Number(item.parsed.y ?? 0), locale)}`,
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
      title={<Text strong>{t("chart.cumulativeTitle")}</Text>}
    >
      {isEmpty ? (
        <div className="flex h-[260px] items-center justify-center">
          <Empty description={t("chart.emptyData")} />
        </div>
      ) : (
        <div className="h-[260px] w-full sm:h-[300px]">
          <Line data={data} options={options} />
        </div>
      )}
    </Card>
  );
}

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
import { buildDailySpending } from "@/helpers/chartData";
import type { Purchase } from "@/models/types";
import { formatIDR } from "@/utils/currency";
import type { CycleInfo } from "@/utils/cycleUtils";

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
  purchases: Purchase[];
  cycle: CycleInfo;
}

/**
 * Line chart: pengeluaran harian dalam satu siklus.
 * Sumbu X = tanggal, Sumbu Y = total pengeluaran.
 * Hari tanpa transaksi ditampilkan dengan nilai 0.
 */
export default function DailySpendingLineChart({ purchases, cycle }: Props) {
  const { mode } = useThemeMode();
  const { t, locale } = useLocale();
  const isDark = mode === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const tickColor = isDark ? "#9ca3af" : "#6b7280";

  const { labels, amounts } = useMemo(
    () => {
      const points = buildDailySpending(purchases, cycle, locale);
      return {
        labels: points.map((p) => p.label),
        amounts: points.map((p) => p.amount),
      };
    },
    [purchases, cycle, locale],
  );

  const primary = "#6366f1";

  const data: ChartData<"line"> = useMemo(() => ({
    labels,
    datasets: [
      {
        label: t("chart.dailySpending"),
        data: amounts,
        borderColor: primary,
        backgroundColor: (ctx) => {
          const { chart } = ctx;
          const { ctx: canvasCtx, chartArea } = chart;
          if (!chartArea) return "rgba(99,102,241,0.15)";
          const gradient = canvasCtx.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom,
          );
          gradient.addColorStop(0, "rgba(99,102,241,0.35)");
          gradient.addColorStop(1, "rgba(99,102,241,0.02)");
          return gradient;
        },
        borderWidth: 2,
        pointRadius: amounts.some((v) => v > 0) ? 2.5 : 0,
        pointHoverRadius: 6,
        pointBackgroundColor: primary,
        fill: true,
        tension: 0.35,
      },
    ],
  }), [labels, amounts, primary, t]);

  const options: ChartOptions<"line"> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          color: tickColor,
          font: { size: 11 },
          usePointStyle: true,
          boxWidth: 8,
          padding: 12,
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
        ticks: {
          color: tickColor,
          font: { size: 10 },
          maxTicksLimit: 15,
          maxRotation: 45,
          minRotation: 0,
        },
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
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} jt`;
            if (v >= 1_000) return `${(v / 1_000).toFixed(0)} rb`;
            return String(v);
          },
        },
        border: { display: false },
      },
    },
  }), [isDark, tickColor, gridColor, locale, t]);

  const isEmpty = amounts.length === 0 || amounts.every((v) => v === 0);

  return (
    <Card
      variant="borderless"
      className="shadow-sm"
      style={{ height: "100%" }}
      styles={{ body: { padding: 16, height: "100%" } }}
      size="small"
      title={<Text strong>{t("chart.dailySpendingTitle")}</Text>}
    >
      {isEmpty ? (
        <div className="flex h-[260px] items-center justify-center">
          <Empty description={t("chart.emptySpending")} />
        </div>
      ) : (
        <div className="h-[260px] w-full sm:h-[300px]">
          <Line data={data} options={options} />
        </div>
      )}
    </Card>
  );
}

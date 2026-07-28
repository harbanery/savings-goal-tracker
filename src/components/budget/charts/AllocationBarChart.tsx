"use client";

import { Card, Empty, Typography } from "antd";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { useMemo } from "react";
import { useThemeMode } from "@/components/theme/ThemeProvider";
import { CATEGORIES } from "@/models/categories";
import type { CycleChartData } from "@/helpers/chartData";
import { formatIDR } from "@/utils/currency";

const { Text } = Typography;

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
);

interface Props {
  cycles: CycleChartData[];
}

/**
 * Bar chart: X = bulan, Y = total pengeluaran per bulan.
 * Warna per-segmen berdasarkan alokasi kategori (stacked).
 */
export default function AllocationBarChart({ cycles }: Props) {
  const { mode } = useThemeMode();
  const isDark = mode === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const tickColor = isDark ? "#9ca3af" : "#6b7280";

  const data: ChartData<"bar"> = useMemo(() => {
    return {
      labels: cycles.map((c) => c.label),
      datasets: CATEGORIES.map((cat) => ({
        label: cat.label,
        data: cycles.map((c) => c.categorySpent[cat.id] ?? 0),
        backgroundColor: cat.color,
        borderRadius: 4,
      })),
    };
  }, [cycles]);

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
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
        stacked: true,
        grid: { display: false },
        ticks: { color: tickColor, font: { size: 10 } },
        border: { display: false },
      },
      y: {
        stacked: true,
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
  };

  const isEmpty = cycles.length === 0;

  return (
    <Card
      variant="borderless"
      className="shadow-sm"
      style={{ height: "100%" }}
      styles={{ body: { padding: 16, height: "100%" } }}
      size="small"
      title={<Text strong>Total Pengeluaran per Bulan</Text>}
    >
      {isEmpty ? (
        <div className="flex h-[260px] items-center justify-center">
          <Empty description="Belum ada data" />
        </div>
      ) : (
        <div className="h-[260px] w-full sm:h-[300px]">
          <Bar data={data} options={options} />
        </div>
      )}
    </Card>
  );
}

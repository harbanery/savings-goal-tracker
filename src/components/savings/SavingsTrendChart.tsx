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
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { useMemo } from "react";
import dayjs from "dayjs";
import { useThemeMode } from "@/components/theme/ThemeProvider";
import type { SavingsGoal } from "@/models/types";
import { formatIDR } from "@/utils/currency";

const { Text } = Typography;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
);

interface Props {
  goals: SavingsGoal[];
}

interface Point {
  ts: number;
  amount: number;
}

/** Kumpulkan semua setoran dari semua goal, lalu hitung total kumulatif per hari. */
function computeCumulative(goals: SavingsGoal[]): {
  labels: string[];
  values: number[];
} {
  const points: Point[] = [];
  for (const goal of goals) {
    for (const c of goal.contributions) {
      const d = dayjs(c.date);
      if (d.isValid()) {
        points.push({ ts: d.startOf("day").valueOf(), amount: c.amount });
      }
    }
  }
  if (points.length === 0) return { labels: [], values: [] };

  points.sort((a, b) => a.ts - b.ts);

  // Gabungkan titik dengan tanggal yang sama.
  const byDay = new Map<number, number>();
  for (const p of points) {
    byDay.set(p.ts, (byDay.get(p.ts) ?? 0) + p.amount);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b);

  const labels: string[] = [];
  const values: number[] = [];
  let running = 0;
  for (const ts of days) {
    running += byDay.get(ts)!;
    labels.push(dayjs(ts).format("D MMM"));
    values.push(running);
  }
  return { labels, values };
}

/** Grafik garis kumulatif tabungan dari waktu ke waktu. */
export default function SavingsTrendChart({ goals }: Props) {
  const { mode } = useThemeMode();
  const isDark = mode === "dark";

  const { labels, values } = useMemo(() => computeCumulative(goals), [goals]);

  const primary = "#6366f1";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const tickColor = isDark ? "#9ca3af" : "#6b7280";

  const data: ChartData<"line"> = {
    labels,
    datasets: [
      {
        label: "Total Tabungan",
        data: values,
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
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: primary,
        pointBorderColor: "transparent",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? "#1f2937" : "#ffffff",
        titleColor: isDark ? "#f9fafb" : "#111827",
        bodyColor: isDark ? "#e5e7eb" : "#374151",
        borderColor: gridColor,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (item) =>
            ` ${formatIDR(Number(item.parsed.y ?? 0))}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: gridColor, drawTicks: false },
        ticks: { color: tickColor, font: { size: 11 }, maxRotation: 0 },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: gridColor, drawTicks: false },
        ticks: {
          color: tickColor,
          font: { size: 11 },
          callback: (value) => formatShort(Number(value)),
        },
        border: { display: false },
      },
    },
  };

  const isEmpty = values.length === 0;

  return (
    <Card
      variant="borderless"
      className="shadow-sm"
      style={{ height: "100%" }}
      styles={{ body: { padding: 16, height: "100%" } }}
      size="small"
      title={<Text strong>Tren Tabungan</Text>}
    >
      {isEmpty ? (
        <div className="flex h-[260px] items-center justify-center">
          <Empty description="Belum ada setoran tercatat" />
        </div>
      ) : (
        <div className="h-[260px] w-full sm:h-[300px]">
          <Line data={data} options={options} />
        </div>
      )}
    </Card>
  );
}

/** Versi ringkas untuk label sumbu Y. */
function formatShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} M`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} jt`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)} rb`;
  return String(value);
}

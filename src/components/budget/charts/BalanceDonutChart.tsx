"use client";

import { Card, Empty, Typography } from "antd";
import { Doughnut } from "react-chartjs-2";
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
import type { CycleStats } from "@/helpers/stats";
import { formatIDR } from "@/utils/currency";

const { Text } = Typography;

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  stats: CycleStats;
}

/**
 * Donut chart: total pengeluaran vs total sisa saldo.
 */
export default function BalanceDonutChart({ stats }: Props) {
  const { mode } = useThemeMode();
  const isDark = mode === "dark";
  const tickColor = isDark ? "#9ca3af" : "#6b7280";

  const data: ChartData<"doughnut"> = useMemo(() => {
    const remaining = Math.max(0, stats.savingsInitial - stats.totalSpent);
    return {
      labels: ["Pengeluaran", "Sisa Saldo"],
      datasets: [
        {
          data: [stats.totalSpent, remaining],
          backgroundColor: ["#ef4444", "#22c55e"],
          borderColor: isDark ? "#0a0a0b" : "#ffffff",
          borderWidth: 3,
          hoverOffset: 4,
        },
      ],
    };
  }, [stats, isDark]);

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
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
        borderColor: isDark ? "#374151" : "#e5e7eb",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (item) =>
            ` ${item.label}: ${formatIDR(Number(item.parsed ?? 0))}`,
        },
      },
    },
  };

  const isEmpty = stats.totalSpent === 0 && stats.remaining === stats.savingsInitial;

  return (
    <Card
      variant="borderless"
      className="shadow-sm"
      style={{ height: "100%" }}
      styles={{ body: { padding: 16, height: "100%" } }}
      size="small"
      title={<Text strong>Saldo: Pengeluaran vs Sisa</Text>}
    >
      {isEmpty ? (
        <div className="flex h-[260px] items-center justify-center">
          <Empty description="Belum ada pengeluaran" />
        </div>
      ) : (
        <div className="relative h-[260px] w-full sm:h-[300px]">
          <Doughnut data={data} options={options} />
        </div>
      )}
    </Card>
  );
}

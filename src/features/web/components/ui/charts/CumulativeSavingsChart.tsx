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
import { useThemeMode } from "@/components/ui/theme/ThemeProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { CycleChartData } from "@/features/web/utils/chartData";
import { formatIDR } from "@/utils/helpers";

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

/** Warna aksen selaras referensi Dashboard Content.svg. */
const EXPECTED_COLOR = "#5781eb";
const ACTUAL_COLOR = "#0dab76";

/**
 * Line chart: akumulasi tabungan per bulan (running) — pasangan chart
 * Tabungan Target vs Aktual. Nilai kumulatif = saldo awal + Σ selisih
 * bersih tiap siklus; garis target dashed, garis aktual solid dengan
 * gradien halus agar tren pertumbuhan tabungan mudah terbaca.
 */
export default function CumulativeSavingsChart({ cycles }: Props) {
  const { mode } = useThemeMode();
  const { t, locale } = useLocale();
  const isDark = mode === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const tickColor = isDark ? "#9ca3af" : "#6b7280";

  const data: ChartData<"line"> = useMemo(() => {
    return {
      labels: cycles.map((c) => c.label),
      datasets: [
        {
          label: t("chart.expectedCumulative"),
          data: cycles.map((c) => c.cumulativeExpected),
          borderColor: EXPECTED_COLOR,
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 2.5,
          pointHoverRadius: 6,
          pointBackgroundColor: EXPECTED_COLOR,
          fill: false,
          tension: 0.35,
        },
        {
          label: t("chart.actualCumulative"),
          data: cycles.map((c) => c.cumulativeActual),
          borderColor: ACTUAL_COLOR,
          backgroundColor: (ctx) => {
            const { chart } = ctx;
            const { ctx: canvasCtx, chartArea } = chart;
            if (!chartArea) return "rgba(13,171,118,0.15)";
            const gradient = canvasCtx.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom,
            );
            gradient.addColorStop(0, "rgba(13,171,118,0.30)");
            gradient.addColorStop(1, "rgba(13,171,118,0.02)");
            return gradient;
          },
          borderWidth: 2,
          pointRadius: 2.5,
          pointHoverRadius: 6,
          pointBackgroundColor: ACTUAL_COLOR,
          fill: true,
          tension: 0.35,
        },
      ],
    };
  }, [cycles, t]);

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

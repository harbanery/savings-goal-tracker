"use client";

import { Card, Empty, Typography } from "antd";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { useMemo } from "react";
import { useThemeMode } from "@/components/ui/theme/ThemeProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatIDR } from "@/utils/helpers";

const { Text } = Typography;

ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
);

interface Props {
  /** Tabungan dilindungi (set user). */
  protectedSavings: number;
  /** Total pengeluaran siklus. */
  totalSpent: number;
  /** Sisa alokasi = bisa dialokasikan − pengeluaran (bisa minus). */
  remaining: number;
}

/** Warna aksen selaras referensi Dashboard Content.svg. */
const COLOR_PROTECTED = "#5781eb";
const COLOR_SPENT = "#ffa726";
const COLOR_OVER = "#d32f2f";
const COLOR_REMAINING = "#0dab76";

/**
 * Doughnut chart: komposisi dana siklus untuk halaman Budget —
 * Tabungan Dilindungi + Terpakai + Sisa Alokasi (relatif total dana).
 */
export default function BudgetCompositionDoughnut({
  protectedSavings,
  totalSpent,
  remaining,
}: Props) {
  const { mode } = useThemeMode();
  const { t, locale } = useLocale();
  const isDark = mode === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const tickColor = isDark ? "#9ca3af" : "#6b7280";

  const over = remaining < 0;
  const spentColor = over ? COLOR_OVER : COLOR_SPENT;

  const data: ChartData<"doughnut"> = useMemo(() => {
    return {
      labels: [
        t("finance.budgetProtected"),
        t("finance.budgetSpent"),
        t("finance.budgetRemaining"),
      ],
      datasets: [
        {
          data: [
            Math.max(0, protectedSavings),
            Math.max(0, totalSpent),
            Math.max(0, remaining),
          ],
          backgroundColor: [COLOR_PROTECTED, spentColor, COLOR_REMAINING],
          borderColor: "transparent",
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }, [protectedSavings, totalSpent, remaining, spentColor, t]);

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
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
            ` ${item.label}: ${formatIDR(Number(item.parsed ?? 0), locale)}`,
        },
      },
    },
  };

  const total = protectedSavings + totalSpent + Math.max(0, remaining);
  const isEmpty = total <= 0;

  return (
    <Card
      variant="borderless"
      className="shadow-sm"
      style={{ height: "100%" }}
      styles={{ body: { padding: 16, height: "100%" } }}
      size="small"
      title={<Text strong>{t("finance.budgetCompositionTitle")}</Text>}
    >
      {isEmpty ? (
        <div className="flex h-[260px] items-center justify-center">
          <Empty description={t("chart.emptyData")} />
        </div>
      ) : (
        <div className="flex h-[260px] w-full items-center justify-center sm:h-[300px]">
          <Doughnut data={data} options={options} />
        </div>
      )}
    </Card>
  );
}

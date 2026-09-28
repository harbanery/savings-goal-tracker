"use client";

import { BulbOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Space, Tooltip, Typography } from "antd";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  getCycleTransactionsAction,
  getHistoricalTransactionsAction,
} from "@/utils/server/actions";
import { computeCycleStats } from "@/features/web/utils/stats";
import { buildCycleChartData } from "@/features/web/utils/chartData";
import type {
  BudgetCategory,
  Transaction,
  UserSettings,
} from "@/features/web/types";
import {
  formatCycleLabel,
  getCurrentCycle,
  shiftCycle,
  type CycleInfo,
} from "@/features/web/utils/cycle";

const ChartLoading = () => (
  <div className="flex h-[300px] items-center justify-center">Loading…</div>
);

const AllocationBarChart = dynamic(
  () => import("./charts/AllocationBarChart"),
  { ssr: false, loading: ChartLoading },
);
const BalanceDonutChart = dynamic(() => import("./charts/BalanceDonutChart"), {
  ssr: false,
  loading: ChartLoading,
});
const CategoryPieChart = dynamic(() => import("./charts/CategoryPieChart"), {
  ssr: false,
  loading: ChartLoading,
});
const CumulativeSavingsLineChart = dynamic(
  () => import("./charts/CumulativeSavingsLineChart"),
  { ssr: false, loading: ChartLoading },
);
const SavingsComparisonBarChart = dynamic(
  () => import("./charts/SavingsComparisonBarChart"),
  { ssr: false, loading: ChartLoading },
);
const TopKeywordsInsights = dynamic(() => import("./TopKeywordsInsights"), {
  ssr: false,
});

const { Text, Title } = Typography;

/** Judul sub-bagian laporan. */
function ReportSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        <span className="text-indigo-500 dark:text-indigo-400">{icon}</span>
        <Title level={5} style={{ marginBottom: 0 }}>
          {title}
        </Title>
      </div>
      {children}
    </section>
  );
}

interface Props {
  initialTransactions: Transaction[];
  initialHistorical: Record<string, Transaction[]>;
  categories: BudgetCategory[];
  settings: UserSettings;
}

/**
 * Halaman Laporan (generate_web.md): kumpulan grafik — saldo, kategori,
 * alokasi per bulan, perbandingan & kumulatif tabungan, pengeluaran
 * per kategori, plus insight keyword.
 */
export default function ReportsView({
  initialTransactions,
  initialHistorical,
  categories,
  settings,
}: Readonly<Props>) {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [historical, setHistorical] =
    useState<Record<string, Transaction[]>>(initialHistorical);
  const [cycle, setCycle] = useState<CycleInfo>(() =>
    getCurrentCycle(settings.cycleStartDay),
  );

  const { t, locale } = useLocale();

  const cycleLabel = formatCycleLabel(cycle.year, cycle.monthIndex, locale);
  const isCurrentCycle = useMemo(
    () => cycle.key === getCurrentCycle(settings.cycleStartDay).key,
    [cycle, settings.cycleStartDay],
  );

  const stats = useMemo(
    () => computeCycleStats(transactions, categories, settings.savingsInitial),
    [transactions, categories, settings.savingsInitial],
  );
  const chartData = useMemo(
    () =>
      buildCycleChartData(
        historical,
        categories,
        settings.savingsInitial,
        locale,
      ),
    [historical, categories, settings.savingsInitial, locale],
  );

  const refreshCycle = useCallback(async (targetCycle: CycleInfo) => {
    try {
      const [fresh, freshHistorical] = await Promise.all([
        getCycleTransactionsAction(targetCycle),
        getHistoricalTransactionsAction(targetCycle, 6),
      ]);
      setTransactions(fresh);
      setHistorical(freshHistorical);
    } catch (err) {
      console.error("[ReportsView] gagal memuat data:", err);
      setTransactions([]);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    refreshCycle(cycle).catch(() => {});
  }, [cycle, refreshCycle]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="mx-auto w-full max-w-350">
      <Title level={4}>{t("menu.reports")}</Title>

      {/* Baris navigasi siklus */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Space size="small">
          <Tooltip title={t("app.prevCycle")}>
            <Button
              shape="circle"
              icon={<LeftOutlined />}
              onClick={() =>
                setCycle((c) => shiftCycle(c, -1, settings.cycleStartDay))
              }
              aria-label={t("app.prevCycle")}
            />
          </Tooltip>
          <Text
            strong
            style={{ fontSize: 15, minWidth: 130, textAlign: "center" }}
          >
            {cycleLabel}
          </Text>
          <Tooltip title={t("app.nextCycle")}>
            <Button
              shape="circle"
              icon={<RightOutlined />}
              onClick={() =>
                setCycle((c) => shiftCycle(c, 1, settings.cycleStartDay))
              }
              aria-label={t("app.nextCycle")}
            />
          </Tooltip>
          {!isCurrentCycle && (
            <Button
              size="small"
              shape="round"
              onClick={() =>
                setCycle(getCurrentCycle(settings.cycleStartDay))
              }
            >
              {t("app.currentCycle")}
            </Button>
          )}
        </Space>
      </div>

      {/* Row 1: Donut (saldo) + Pie (kategori) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BalanceDonutChart stats={stats} />
        <CategoryPieChart cycles={chartData} categories={categories} />
      </div>

      {/* Row 2: Allocation Bar */}
      <div className="mt-4">
        <AllocationBarChart cycles={chartData} categories={categories} />
      </div>

      {/* Row 3: Savings comparison + Cumulative line */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SavingsComparisonBarChart cycles={chartData} />
        <CumulativeSavingsLineChart cycles={chartData} />
      </div>

      <ReportSection icon={<BulbOutlined />} title={t("app.tabFacts")}>
        <TopKeywordsInsights
          transactions={transactions}
          categories={categories}
        />
      </ReportSection>
    </div>
  );
}

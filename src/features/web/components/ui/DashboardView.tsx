"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Alert, Button } from "antd";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useCycle } from "@/features/web/hooks/cycle";
import { formatCycleLabel, type CycleInfo } from "@/features/web/utils/cycle";
import { formatIDR } from "@/utils/helpers";
import TransactionFormModal from "./TransactionFormModal";
import StatsCards from "./StatsCards";

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
const DailySpendingLineChart = dynamic(
  () => import("./charts/DailySpendingLineChart"),
  { ssr: false, loading: ChartLoading },
);
const SavingsComparisonBarChart = dynamic(
  () => import("./charts/SavingsComparisonBarChart"),
  { ssr: false, loading: ChartLoading },
);

interface Props {
  initialTransactions: Transaction[];
  initialHistorical: Record<string, Transaction[]>;
  categories: BudgetCategory[];
  settings: UserSettings;
}

/**
 * Dashboard ringkas sesuai generate_web.md: kartu Saldo / Pemasukan /
 * Pengeluaran / Cash Flow, pengeluaran harian, dan grafik historis
 * (donut saldo, pie kategori, bar alokasi bulanan, perbandingan &
 * kumulatif tabungan). Catatan transaksi ada di halaman Transaksi.
 */
export default function DashboardView({
  initialTransactions,
  initialHistorical,
  categories,
  settings,
}: Readonly<Props>) {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [historical, setHistorical] =
    useState<Record<string, Transaction[]>>(initialHistorical);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /** Siklus aktif global (dipilih lewat DatePicker month di navbar). */
  const { cycle } = useCycle();

  const { t, locale } = useLocale();

  const cycleLabel = formatCycleLabel(cycle.year, cycle.monthIndex, locale);

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

  const editingTransaction = useMemo(
    () =>
      editingId
        ? (transactions.find((tr) => tr.id === editingId) ?? null)
        : null,
    [transactions, editingId],
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
      console.error("[DashboardView] gagal memuat data:", err);
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
      {/* Navigasi siklus ada di navbar (DatePicker month); sisakan tombol tambah */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingId(null);
            setFormOpen(true);
          }}
        >
          {t("table.addPurchase")}
        </Button>
      </div>

      {stats.overLimit && (
        <Alert
          type="error"
          showIcon
          title={t("app.overLimitTitle")}
          description={t("app.overLimitDesc", {
            spent: formatIDR(stats.totalSpent, locale),
            limit: formatIDR(stats.spendingLimit, locale),
            diff: formatIDR(Math.abs(stats.limitRemaining), locale),
          })}
          style={{ marginBottom: 24 }}
        />
      )}

      <StatsCards stats={stats} />

      <div className="mb-4">
        <DailySpendingLineChart transactions={transactions} cycle={cycle} />
      </div>

      {/* Row: Donut (saldo) + Pie (kategori) */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BalanceDonutChart stats={stats} />
        <CategoryPieChart cycles={chartData} categories={categories} />
      </div>

      {/* Row: Allocation Bar */}
      <div className="mb-4">
        <AllocationBarChart cycles={chartData} categories={categories} />
      </div>

      {/* Row: Savings comparison + Cumulative line */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SavingsComparisonBarChart cycles={chartData} />
        <CumulativeSavingsLineChart cycles={chartData} />
      </div>

      <TransactionFormModal
        open={formOpen}
        editingTransaction={editingTransaction}
        categories={categories}
        cycleLabel={cycleLabel}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
        }}
        onSaved={() => void refreshCycle(cycle)}
      />
    </div>
  );
}

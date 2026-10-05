"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Card } from "antd";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  getCycleTransactionsAction,
  getAllTimeTotalsAction,
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
import type { CycleInfo } from "@/features/web/utils/cycle";
import { formatIDR } from "@/utils/helpers";
import TransactionFormModal from "./TransactionFormModal";
import StatsCards, { type AllTimeTotals } from "./StatsCards";
import CategoryBreakdownList from "./CategoryBreakdownList";

const ChartLoading = () => {
  const { t } = useLocale();
  return (
    <div className="flex h-[300px] items-center justify-center">
      {t("common.loading")}
    </div>
  );
};
const AllocationBarChart = dynamic(
  () => import("./charts/AllocationBarChart"),
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
const CumulativeSavingsChart = dynamic(
  () => import("./charts/CumulativeSavingsChart"),
  { ssr: false, loading: ChartLoading },
);

interface Props {
  initialTransactions: Transaction[];
  initialHistorical: Record<string, Transaction[]>;
  /** Total pemasukan & pengeluaran seluruh waktu (kartu utama). */
  initialAllTime: AllTimeTotals;
  categories: BudgetCategory[];
  settings: UserSettings;
}

/**
 * Dashboard sesuai referensi public/references/Dashboard Content.svg:
 * baris kartu statistik (5 utama + 5 mini), line chart pengeluaran harian
 * per tanggal (satu baris penuh), rincian kategori + total pengeluaran
 * per bulan (sejajar), lalu perbandingan tabungan target vs aktual +
 * tabungan kumulatif (sejajar). Catatan transaksi ada di halaman Transaksi.
 */
export default function DashboardView({
  initialTransactions,
  initialHistorical,
  initialAllTime,
  categories,
  settings,
}: Readonly<Props>) {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [historical, setHistorical] =
    useState<Record<string, Transaction[]>>(initialHistorical);
  const [allTime, setAllTime] = useState<AllTimeTotals>(initialAllTime);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /** Siklus aktif global (dipilih lewat DatePicker month di navbar). */
  const { cycle } = useCycle();

  const { t, locale } = useLocale();

  const stats = useMemo(
    () =>
      computeCycleStats(
        transactions,
        categories,
        settings.savingsInitial,
        settings.protectedSavings,
      ),
    [transactions, categories, settings],
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
      const [fresh, freshHistorical, freshAllTime] = await Promise.all([
        getCycleTransactionsAction(targetCycle),
        getHistoricalTransactionsAction(targetCycle, 6),
        getAllTimeTotalsAction(),
      ]);
      setTransactions(fresh);
      setHistorical(freshHistorical);
      setAllTime(freshAllTime);
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

      <StatsCards stats={stats} allTime={allTime} cycle={cycle} />

      {/* Baris 1: line chart pengeluaran harian per tanggal (satu baris penuh) */}
      <div className="mb-4">
        <DailySpendingLineChart transactions={transactions} cycle={cycle} />
      </div>

      {/* Baris 2: rincian pengeluaran per kategori (kiri, lebih sempit) +
          total pengeluaran per bulan (kanan, lebih lebar) */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Card
            variant="borderless"
            className="shadow-sm"
            style={{ height: "100%" }}
            styles={{ body: { padding: 16, height: "100%" } }}
            size="small"
          >
            <CategoryBreakdownList categories={stats.categories} />
          </Card>
        </div>
        <div className="lg:col-span-7">
          <AllocationBarChart cycles={chartData} categories={categories} />
        </div>
      </div>

      {/* Baris 3: perbandingan tabungan target vs aktual (kiri) +
          tabungan kumulatif (kanan) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SavingsComparisonBarChart cycles={chartData} />
        <CumulativeSavingsChart cycles={chartData} />
      </div>

      <TransactionFormModal
        open={formOpen}
        editingTransaction={editingTransaction}
        categories={categories}
        cycle={cycle}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
        }}
        onSaved={() => void refreshCycle(cycle)}
      />
    </div>
  );
}

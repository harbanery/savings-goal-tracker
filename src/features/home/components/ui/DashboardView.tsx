"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Card } from "antd";
import dynamic from "next/dynamic";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  use,
} from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  getAllTimeTotalsAction,
  getCycleTransactionsAction,
  getHistoricalTransactionsAction,
} from "@/utils/server/actions";
import { computeCycleStats } from "@/features/web/utils/stats";
import { buildCycleChartData } from "@/features/home/utils/chartData";
import type {
  BudgetCategory,
  Transaction,
  UserSettings,
} from "@/features/web/types";
import { useCycle } from "@/features/web/hooks/cycle";
import type { CycleInfo } from "@/features/web/utils/cycle";
import { formatIDR } from "@/utils/helpers";
import TransactionFormModal from "@/features/transactions/components/ui/TransactionFormModal";
import SectionSkeleton from "@/features/web/components/ui/sectionSkeleton";
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
const DailySpendingLineChart = dynamic(
  () => import("./charts/DailySpendingLineChart"),
  { ssr: false, loading: ChartLoading },
);
const AllocationBarChart = dynamic(() => import("./charts/AllocationBarChart"), {
  ssr: false,
  loading: ChartLoading,
});
const SavingsComparisonBarChart = dynamic(
  () => import("./charts/SavingsComparisonBarChart"),
  { ssr: false, loading: ChartLoading },
);
const CumulativeSavingsChart = dynamic(
  () => import("./charts/CumulativeSavingsChart"),
  { ssr: false, loading: ChartLoading },
);

interface Props {
  /** Transaksi siklus aktif — promise di-stream dari server (A3). */
  transactionsPromise: Promise<Transaction[]>;
  /** Total pemasukan & pengeluaran seluruh waktu (kartu utama). */
  allTimePromise: Promise<AllTimeTotals>;
  /** Transaksi 6 siklus terakhir untuk grafik historis. */
  historicalPromise: Promise<Record<string, Transaction[]>>;
  categories: BudgetCategory[];
  settings: UserSettings;
}

/** Prop bersama tiap slice (data awal via promise + pemicu muat ulang). */
interface SliceProps {
  categories: BudgetCategory[];
  settings: UserSettings;
  /** Naik saat transaksi disimpan/diubah agar slice memuat ulang. */
  refreshKey: number;
}

/**
 * Dashboard sesuai referensi public/references/Dashboard Content.svg:
 * baris kartu statistik (5 utama + 5 mini), line chart pengeluaran harian
 * per tanggal (satu baris penuh), rincian kategori + total pengeluaran
 * per bulan (sejajar), lalu perbandingan tabungan target vs aktual +
 * tabungan kumulatif (sejajar). Catatan transaksi ada di halaman Transaksi.
 *
 * A3 (rekomendasi_feature.md): komponen ini adalah shell yang langsung
 * dirender (toolbar + modal), sementara slice data lambat masing-masing
 * di-stream dalam `<Suspense>` terpisah — kartu statistik tidak menunggu
 * grafik historis, dan sebaliknya.
 */
export default function DashboardView({
  transactionsPromise,
  allTimePromise,
  historicalPromise,
  categories,
  settings,
}: Readonly<Props>) {
  const [formOpen, setFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { t } = useLocale();

  /** Siklus aktif global (dipilih lewat DatePicker month di navbar). */
  const { cycle } = useCycle();

  return (
    <div className="mx-auto w-full max-w-350">
      {/* Navigasi siklus ada di navbar (DatePicker month); sisakan tombol tambah.
          Dashboard hanya MENAMBAH transaksi (tidak mengedit) — modal selalu
          mode tambah. */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setFormOpen(true)}
        >
          {t("table.addPurchase")}
        </Button>
      </div>

      {/* Slice 1: alert batas + kartu statistik + line chart pengeluaran
          harian (butuh transaksi siklus + total seluruh waktu). */}
      <Suspense fallback={<SectionSkeleton variant="stats" />}>
        <DashboardStatsSlice
          transactionsPromise={transactionsPromise}
          allTimePromise={allTimePromise}
          categories={categories}
          settings={settings}
          refreshKey={refreshKey}
        />
      </Suspense>

      {/* Slice 2: rincian kategori + grafik historis (butuh transaksi siklus
          + historis 6 siklus) — tidak menunggu slice kartu statistik. */}
      <Suspense fallback={<SectionSkeleton variant="charts" />}>
        <DashboardChartsSlice
          transactionsPromise={transactionsPromise}
          historicalPromise={historicalPromise}
          categories={categories}
          settings={settings}
          refreshKey={refreshKey}
        />
      </Suspense>

      <TransactionFormModal
        open={formOpen}
        editingTransaction={null}
        categories={categories}
        cycle={cycle}
        onClose={() => setFormOpen(false)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
    </div>
  );
}

/** Slice statistik: alert over-limit + StatsCards + pengeluaran harian. */
function DashboardStatsSlice({
  transactionsPromise,
  allTimePromise,
  categories,
  settings,
  refreshKey,
}: Readonly<SliceProps & {
  transactionsPromise: Promise<Transaction[]>;
  allTimePromise: Promise<AllTimeTotals>;
}>) {
  // Data awal di-stream dari server; setelahnya dikelola state lokal.
  const initialTransactions = use(transactionsPromise);
  const initialAllTime = use(allTimePromise);
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [allTime, setAllTime] = useState<AllTimeTotals>(initialAllTime);

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

  const refresh = useCallback(async (targetCycle: CycleInfo) => {
    try {
      const [fresh, freshAllTime] = await Promise.all([
        getCycleTransactionsAction(targetCycle),
        getAllTimeTotalsAction(),
      ]);
      setTransactions(fresh);
      setAllTime(freshAllTime);
    } catch (err) {
      console.error("[DashboardView] gagal memuat data:", err);
      setTransactions([]);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    refresh(cycle).catch(() => {});
  }, [cycle, refreshKey, refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <>
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
    </>
  );
}

/** Slice grafik: rincian kategori + alokasi bulanan + perbandingan &
 *  kumulatif tabungan. */
function DashboardChartsSlice({
  transactionsPromise,
  historicalPromise,
  categories,
  settings,
  refreshKey,
}: Readonly<SliceProps & {
  transactionsPromise: Promise<Transaction[]>;
  historicalPromise: Promise<Record<string, Transaction[]>>;
}>) {
  const initialTransactions = use(transactionsPromise);
  const initialHistorical = use(historicalPromise);
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [historical, setHistorical] =
    useState<Record<string, Transaction[]>>(initialHistorical);

  const { cycle } = useCycle();
  const { locale } = useLocale();

  // Rincian kategori diturunkan dari transaksi siklus (statistik siklus).
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
        settings.protectedSavings,
        settings.savingsInitial,
        locale,
      ),
    [historical, settings.protectedSavings, settings.savingsInitial, locale],
  );

  const refresh = useCallback(async (targetCycle: CycleInfo) => {
    try {
      const [fresh, freshHistorical] = await Promise.all([
        getCycleTransactionsAction(targetCycle),
        getHistoricalTransactionsAction(targetCycle, 6),
      ]);
      setTransactions(fresh);
      setHistorical(freshHistorical);
    } catch (err) {
      console.error("[DashboardView] gagal memuat data historis:", err);
      setTransactions([]);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    refresh(cycle).catch(() => {});
  }, [cycle, refreshKey, refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <>
      {/* Baris 2: rincian pengeluaran per kategori (kiri, lebih sempit) +
          total pengeluaran per bulan (kanan, lebih lebar) */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Card
            variant="borderless"
            className="shadow-sm!"
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
    </>
  );
}

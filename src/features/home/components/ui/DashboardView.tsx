"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Divider, Segmented, Typography } from "antd";
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
  getBudgetOverviewAction,
  getCycleTransactionsAction,
  getHistoricalTransactionsAction,
  getProtectedSavingsMapAction,
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
import RecentTransactions from "./RecentTransactions";

const { Text } = Typography;

/** Pilihan rentang historis chart (rekomendasi D1: 3/6/12 siklus). */
const RANGE_OPTIONS = [3, 6, 12] as const;
const DEFAULT_RANGE = 3;

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
  /** Transaksi beberapa siklus terakhir untuk grafik historis. */
  historicalPromise: Promise<Record<string, Transaction[]>>;
  /**
   * Tabungan dilindungi siklus aktif (dinamis per siklus — siklus baru = 0).
   */
  protectedSavings: number;
  /**
   * Tabungan dilindungi per siklus (map kunci siklus → nilai) untuk grafik
   * historis — target tiap siklus berbeda karena nilainya dinamis.
   */
  protectedSavingsMap: Record<string, number>;
  categories: BudgetCategory[];
  settings: UserSettings;
}

/** Prop bersama tiap slice (data awal via promise + pemicu muat ulang). */
interface SliceProps {
  categories: BudgetCategory[];
  settings: UserSettings;
  /** Naik saat transaksi disimpan/diubah/dihapus agar slice memuat ulang. */
  refreshKey: number;
  /** D1: buka modal tambah transaksi (CTA empty state). */
  onAddFirst: () => void;
}

/** Prop tambahan slice statistik (aksi cepat daftar transaksi terakhir). */
interface StatsSliceProps extends SliceProps {
  /** D1: buka modal edit transaksi (aksi cepat list terakhir). */
  onEdit: (transaction: Transaction) => void;
  /** Dipanggil setelah hapus cepat sukses agar semua slice memuat ulang. */
  onChanged: () => void;
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
  protectedSavings,
  protectedSavingsMap,
  categories,
  settings,
}: Readonly<Props>) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { t } = useLocale();

  /** Siklus aktif global (dipilih lewat DatePicker month di navbar). */
  const { cycle } = useCycle();

  const openAdd = useCallback(() => {
    setEditingTx(null);
    setFormOpen(true);
  }, []);
  const openEdit = useCallback((transaction: Transaction) => {
    setEditingTx(transaction);
    setFormOpen(true);
  }, []);
  const handleChanged = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  return (
    <div className="mx-auto w-full">
      {/* Navigasi siklus ada di navbar (DatePicker month); sisakan tombol tambah.
          Modal dipakai bersama: mode tambah (CTA/tombol) & mode edit (aksi
          cepat di daftar transaksi terakhir — D1). */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openAdd}
        >
          {t("table.addPurchase")}
        </Button>
      </div>

      {/* Slice 1: alert batas + kartu statistik + line chart pengeluaran
          harian + daftar transaksi terakhir (butuh transaksi siklus +
          total seluruh waktu). */}
      <Suspense fallback={<SectionSkeleton variant="stats" />}>
        <DashboardStatsSlice
          transactionsPromise={transactionsPromise}
          allTimePromise={allTimePromise}
          protectedSavings={protectedSavings}
          categories={categories}
          settings={settings}
          refreshKey={refreshKey}
          onAddFirst={openAdd}
          onEdit={openEdit}
          onChanged={handleChanged}
        />
      </Suspense>

      {/* Slice 2: rincian kategori + grafik historis (butuh transaksi siklus
          + historis beberapa siklus) — tidak menunggu slice kartu statistik. */}
      <Suspense fallback={<SectionSkeleton variant="charts" />}>
        <DashboardChartsSlice
          transactionsPromise={transactionsPromise}
          historicalPromise={historicalPromise}
          protectedSavings={protectedSavings}
          protectedSavingsMap={protectedSavingsMap}
          categories={categories}
          settings={settings}
          refreshKey={refreshKey}
          onAddFirst={openAdd}
        />
      </Suspense>

      <TransactionFormModal
        open={formOpen}
        editingTransaction={editingTx}
        categories={categories}
        cycle={cycle}
        onClose={() => setFormOpen(false)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
    </div>
  );
}

/** Slice statistik: alert over-limit + StatsCards + pengeluaran harian +
 *  daftar 5 transaksi terakhir dengan aksi cepat (D1). */
function DashboardStatsSlice({
  transactionsPromise,
  allTimePromise,
  protectedSavings,
  categories,
  settings,
  refreshKey,
  onAddFirst,
  onEdit,
  onChanged,
}: Readonly<StatsSliceProps & {
  transactionsPromise: Promise<Transaction[]>;
  allTimePromise: Promise<AllTimeTotals>;
  /** Tabungan dilindungi siklus aktif (dinamis per siklus). */
  protectedSavings: number;
}>) {
  // Data awal di-stream dari server; setelahnya dikelola state lokal.
  const initialTransactions = use(transactionsPromise);
  const initialAllTime = use(allTimePromise);
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [allTime, setAllTime] = useState<AllTimeTotals>(initialAllTime);

  const { cycle } = useCycle();
  const { t, locale } = useLocale();

  // Tabungan dilindungi siklus aktif — dinamis per siklus, jadi ikut
  // dimuat ulang saat siklus berubah (nilai awal dari server).
  const [cycleProtected, setCycleProtected] = useState(protectedSavings);

  const stats = useMemo(
    () =>
      computeCycleStats(
        transactions,
        categories,
        settings.savingsInitial,
        cycleProtected,
      ),
    [transactions, categories, settings.savingsInitial, cycleProtected],
  );

  const refresh = useCallback(async (targetCycle: CycleInfo) => {
    try {
      const [fresh, freshAllTime, overview] = await Promise.all([
        getCycleTransactionsAction(targetCycle),
        getAllTimeTotalsAction(),
        getBudgetOverviewAction(targetCycle),
      ]);
      setTransactions(fresh);
      setAllTime(freshAllTime);
      setCycleProtected(overview.protectedSavings);
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
        <DailySpendingLineChart
          transactions={transactions}
          cycle={cycle}
          onAddFirst={onAddFirst}
        />
      </div>

      {/* D1: 5 transaksi terakhir + aksi edit/hapus cepat (satu baris penuh) */}
      <div className="mb-4">
        <RecentTransactions
          transactions={transactions}
          categories={categories}
          onEdit={onEdit}
          onAddFirst={onAddFirst}
          onChanged={onChanged}
        />
      </div>
    </>
  );
}

/** Slice grafik: rincian kategori + alokasi bulanan + perbandingan &
 *  kumulatif tabungan. Rentang historis bisa diubah (D1: 3/6/12 siklus). */
function DashboardChartsSlice({
  transactionsPromise,
  historicalPromise,
  protectedSavings,
  protectedSavingsMap,
  categories,
  settings,
  refreshKey,
  onAddFirst,
}: Readonly<SliceProps & {
  transactionsPromise: Promise<Transaction[]>;
  historicalPromise: Promise<Record<string, Transaction[]>>;
  /** Tabungan dilindungi siklus aktif (dinamis per siklus). */
  protectedSavings: number;
  /** Tabungan dilindungi per siklus (map kunci siklus → nilai). */
  protectedSavingsMap: Record<string, number>;
}>) {
  const initialTransactions = use(transactionsPromise);
  const initialHistorical = use(historicalPromise);
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [historical, setHistorical] =
    useState<Record<string, Transaction[]>>(initialHistorical);
  /** D1: rentang historis aktif — parameter count getHistoricalTransactionsAction. */
  const [rangeCount, setRangeCount] = useState<number>(DEFAULT_RANGE);
  const [rangeLoading, setRangeLoading] = useState(false);

  const { cycle } = useCycle();
  const { locale, t } = useLocale();

  // Tabungan dilindungi siklus aktif + peta per siklus (dinamis per siklus).
  const [cycleProtected, setCycleProtected] = useState(protectedSavings);
  const [protectedMap, setProtectedMap] =
    useState<Record<string, number>>(protectedSavingsMap);

  // Rincian kategori diturunkan dari transaksi siklus (statistik siklus).
  const stats = useMemo(
    () =>
      computeCycleStats(
        transactions,
        categories,
        settings.savingsInitial,
        cycleProtected,
      ),
    [transactions, categories, settings.savingsInitial, cycleProtected],
  );
  const chartData = useMemo(
    () =>
      buildCycleChartData(
        historical,
        protectedMap,
        settings.savingsInitial,
        locale,
      ),
    [historical, protectedMap, settings.savingsInitial, locale],
  );

  const refresh = useCallback(async (targetCycle: CycleInfo, count: number) => {
    setRangeLoading(true);
    try {
      const [fresh, freshHistorical, overview, freshProtectedMap] =
        await Promise.all([
          getCycleTransactionsAction(targetCycle),
          getHistoricalTransactionsAction(targetCycle, count),
          getBudgetOverviewAction(targetCycle),
          getProtectedSavingsMapAction(targetCycle, count),
        ]);
      setTransactions(fresh);
      setHistorical(freshHistorical);
      setCycleProtected(overview.protectedSavings);
      setProtectedMap(freshProtectedMap);
    } catch (err) {
      console.error("[DashboardView] gagal memuat data historis:", err);
      setTransactions([]);
    } finally {
      setRangeLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    refresh(cycle, rangeCount).catch(() => {});
  }, [cycle, refreshKey, rangeCount, refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <>
      {/* Divider pemisah di atas kontrol "Rentang historis" (DROID.md:
          beri divider di atasnya) agar tidak menyatu dengan chart
          pengeluaran harian di atasnya. */}
      <Divider style={{ margin: "0 0 12px" }} />

      {/* D1: pilihan rentang historis (3/6/12 siklus) untuk semua chart
          historis di bawah. */}
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t("dashboard.rangeLabel")}
        </Text>
        <Segmented
          size="small"
          value={rangeCount}
          disabled={rangeLoading}
          options={RANGE_OPTIONS.map((n) => ({
            value: n,
            label: t("dashboard.rangeCycles", { n }),
          }))}
          onChange={(value) => setRangeCount(value as number)}
        />
      </div>

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
            <CategoryBreakdownList
              categories={stats.categories}
              onAddFirst={onAddFirst}
            />
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

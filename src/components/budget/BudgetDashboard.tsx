"use client";

import {
  BarChartOutlined,
  BulbOutlined,
  LeftOutlined,
  RightOutlined,
  TableOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Space,
  Spin,
  Tabs,
  Typography,
} from "antd";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import ThemeToggle from "@/components/theme/ThemeToggle";
import LanguageToggle from "@/components/locale/LanguageToggle";
import { useLocale } from "@/components/locale/LocaleProvider";
import { useCycleConfig } from "@/components/config/CycleConfigProvider";
// import CycleStartPicker from "@/components/config/CycleStartPicker";
import {
  deletePurchasesAction,
  deletePurchaseAction,
  getCyclePurchasesAction,
  getHistoricalPurchasesAction,
} from "@/server/actions";
import { computeCycleStats } from "@/helpers/stats";
import { buildCycleChartData, groupPurchasesByCycle } from "@/helpers/chartData";
import type { Purchase, PurchaseInput } from "@/models/types";
import { IS_DEMO } from "@/config/variables";
import {
  formatCycleLabel,
  getCycleInfo,
  getCurrentCycle,
  isDateInCycle,
  type CycleInfo,
} from "@/utils/cycleUtils";
import { formatIDR } from "@/utils/currency";
import CategoryBreakdown from "./CategoryBreakdown";
import NotificationBell from "./NotificationBell";
import PurchaseFormModal from "./PurchaseFormModal";
import PurchaseTable from "./PurchaseTable";
import RealtimeClock from "./RealtimeClock";
import StatsCards from "./StatsCards";

/**
 * Komponen chart dimuat secara lazy (code-splitting) agar pustaka chart.js
 * (~230 KB) berada di chunk terpisah dan tidak dievaluasi pada critical path.
 * Ini menurunkan Total Blocking Time (TBT) dan mempercepat FCP/LCP.
 */
const ChartLoading = () => (
  <Card
    variant="borderless"
    className="shadow-sm"
    style={{ height: "100%" }}
    styles={{
      body: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: 260,
      },
    }}
  >
    <Spin />
  </Card>
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
const TopKeywordsInsights = dynamic(() => import("./TopKeywordsInsights"), {
  ssr: false,
});

/** Batas bawah siklus yang dapat dipilih: Juli 2026 (Agustus = 25 Juli 2026). */
const MIN_CYCLE = dayjs("2026-08-01");

/** Apakah siklus sudah di batas minimum (tidak bisa mundur lagi)? */
function isAtMinCycle(cycle: CycleInfo): boolean {
  return cycle.year <= 2026 && cycle.monthIndex <= 7;
}

const { Title, Paragraph } = Typography;

interface Props {
  initialPurchases: Purchase[];
  initialHistorical: Record<string, Purchase[]>;
}

/**
 * Dashboard utama (Client Component) untuk Monthly Budget Tracker.
 * Mengelola state daftar pembelian + siklus bulanan + sinkron server.
 */
export default function BudgetDashboard({
  initialPurchases,
  initialHistorical,
}: Readonly<Props>) {
  // Track selected cycle month (year + monthIndex), independent dari startDay.
  // startDay dari store mengubah range tanggal, bukan posisi bulan.
  const initialCycle = getCurrentCycle();
  const [selectedYear, setSelectedYear] = useState(initialCycle.year);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(
    initialCycle.monthIndex,
  );
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [historical, setHistorical] =
    useState<Record<string, Purchase[]>>(initialHistorical);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("charts");
  /** Mode mockup publik: tanpa DB, data hanya di memori (hilang saat reload). */
  const isDemo = IS_DEMO;

  const { t, locale } = useLocale();
  const { startDay } = useCycleConfig();

  // Derive info siklus dari pilihan bulan + startDay aktif (tidak perlu
  // setState di effect). Saat startDay berubah, range tanggal recompute otomatis.
  const cycle = useMemo(
    () => getCycleInfo(selectedYear, selectedMonthIndex, startDay),
    [selectedYear, selectedMonthIndex, startDay],
  );

  const cycleLabel = formatCycleLabel(cycle.year, cycle.monthIndex, locale);

  /**
   * Pembelian yang tampil untuk siklus aktif.
   * Mode normal: state `purchases` sudah per-siklus (di-fetch dari server).
   * Mode demo: satu array in-memory difilter per siklus di client.
   */
  const visiblePurchases = useMemo(
    () =>
      isDemo
        ? purchases.filter((p) => isDateInCycle(new Date(p.date), cycle))
        : purchases,
    [isDemo, purchases, cycle],
  );

  const stats = useMemo(
    () => computeCycleStats(visiblePurchases),
    [visiblePurchases],
  );
  const chartData = useMemo(
    () =>
      buildCycleChartData(
        isDemo ? groupPurchasesByCycle(purchases, startDay) : historical,
        locale,
      ),
    [isDemo, purchases, historical, locale, startDay],
  );

  const editingPurchase = useMemo(
    () =>
      editingId ? (purchases.find((p) => p.id === editingId) ?? null) : null,
    [purchases, editingId],
  );

  /** Refetch pembelian untuk siklus tertentu dari server (mode normal). */
  const refreshCycle = useCallback(
    async (targetCycle: CycleInfo) => {
      if (isDemo) return; // mode mockup: data in-memory, tidak ada server fetch
      try {
        const [fresh, freshHistorical] = await Promise.all([
          getCyclePurchasesAction(targetCycle),
          getHistoricalPurchasesAction(targetCycle, 6),
        ]);
        setPurchases(fresh);
        setHistorical(freshHistorical);
      } catch (err) {
        console.error("[BudgetDashboard] gagal memuat pembelian:", err);
        setPurchases([]);
      }
    },
    [isDemo],
  );

  // Muat ulang data dari server saat range siklus berubah (baik karena
  // navigasi bulan atau perubahan startDay). Fetch async; setState terjadi
  // setelah promise resolve, bukan synchronous di effect body.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    refreshCycle(cycle).catch((err) =>
      console.error("[BudgetDashboard] gagal memuat pembelian:", err),
    );
  }, [cycle, refreshCycle]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /** Geser ke siklus bulan lain (delta dalam bulan). */
  const handleShiftCycle = useCallback(
    (deltaMonths: number) => {
      const total = selectedYear * 12 + selectedMonthIndex + deltaMonths;
      setSelectedYear(Math.floor(total / 12));
      setSelectedMonthIndex(((total % 12) + 12) % 12);
    },
    [selectedYear, selectedMonthIndex],
  );

  /** Lompat ke bulan/tahun tertentu (dari DatePicker). */
  const handlePickMonth = useCallback((year: number, monthIndex: number) => {
    setSelectedYear(year);
    setSelectedMonthIndex(monthIndex);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      // Optimistic: hapus dari state lokal dulu
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      if (isDemo) return; // mode mockup: state lokal adalah satu-satunya sumber
      try {
        await deletePurchaseAction(id);
      } catch (err) {
        console.error("[BudgetDashboard] gagal menghapus:", err);
        await refreshCycle(cycle);
      }
    },
    [isDemo, cycle, refreshCycle],
  );

  const handleDeleteBulk = useCallback(
    async (ids: string[]) => {
      // Optimistic: hapus dari state lokal dulu
      setPurchases((prev) => prev.filter((p) => !ids.includes(p.id)));
      if (isDemo) return; // mode mockup: state lokal adalah satu-satunya sumber
      try {
        await deletePurchasesAction(ids);
      } catch (err) {
        console.error("[BudgetDashboard] gagal menghapus bulk:", err);
        await refreshCycle(cycle);
      }
    },
    [isDemo, cycle, refreshCycle],
  );

  /** Simpan pembelian baru (demo: in-memory dengan id UUID client). */
  const handleDemoCreate = useCallback((input: PurchaseInput) => {
    const now = new Date();
    setPurchases((prev) => [
      {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `demo-${now.getTime()}-${Math.random().toString(36).slice(2)}`,
        name: input.name,
        categoryId: input.categoryId,
        amount: input.amount,
        note: input.note,
        date: input.date,
      },
      ...prev,
    ]);
  }, []);

  /** Perbarui pembelian (demo: in-memory). */
  const handleDemoUpdate = useCallback(
    (id: string, input: PurchaseInput) => {
      setPurchases((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                name: input.name,
                categoryId: input.categoryId,
                amount: input.amount,
                note: input.note,
                date: input.date,
              }
            : p,
        ),
      );
    },
    [],
  );

  /** Import massal (demo: in-memory, tanpa server action). */
  const handleDemoImport = useCallback(
    (inputs: PurchaseInput[]): { imported: number; errors: string[] } => {
      let imported = 0;
      const errors: string[] = [];
      const now = Date.now();
      const created: Purchase[] = [];
      inputs.forEach((input, i) => {
        if (!input.name || !input.categoryId || !(input.amount > 0)) {
          errors.push(`Baris ${i + 1}: data tidak valid`);
          return;
        }
        imported++;
        created.push({
          id: `demo-${now}-${i}-${Math.random().toString(36).slice(2)}`,
          name: input.name,
          categoryId: input.categoryId,
          amount: input.amount,
          note: input.note,
          date: input.date,
        });
      });
      if (created.length > 0) setPurchases((prev) => [...created, ...prev]);
      return { imported, errors };
    },
    [],
  );

  const handleOpenCreate = useCallback(() => {
    setEditingId(null);
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((purchase: Purchase) => {
    setEditingId(purchase.id);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingId(null);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-350 px-4 py-6 md:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Title
              level={2}
              style={{ marginBottom: 4 }}
              className="text-xl! sm:text-2xl! md:text-3xl!"
            >
              {t("app.title")}
            </Title>
            <Paragraph
              type="secondary"
              style={{ marginBottom: 0 }}
              className="text-sm sm:text-base"
            >
              {t("app.description")}{" "}
              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                {t("app.cycleLabel", { label: cycleLabel })}:{" "}
                {dayjs(cycle.startDate).format("D MMM")}{" "}
                {t("app.rangeSeparator")}{" "}
                {dayjs(cycle.endDate).format("D MMM YYYY")}
              </span>
            </Paragraph>
          </div>
          <div className="flex flex-col justify-start gap-3 items-end">
            <RealtimeClock />
            <div className="flex w-full flex-col items-end gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
              <Space>
                <ThemeToggle />
                <LanguageToggle />
                <NotificationBell />
              </Space>
              <Space>
                <Button
                  icon={<LeftOutlined />}
                  disabled={isAtMinCycle(cycle)}
                  onClick={() => handleShiftCycle(-1)}
                />
                <DatePicker
                  picker="month"
                  allowClear={false}
                  disabledDate={(d) => d.isBefore(MIN_CYCLE, "month")}
                  value={dayjs(new Date(cycle.year, cycle.monthIndex, 1))}
                  onChange={(v) => {
                    if (v) {
                      handlePickMonth(v.year(), v.month());
                    }
                  }}
                  format="MMMM YYYY"
                />
                <Button
                  icon={<RightOutlined />}
                  onClick={() => handleShiftCycle(1)}
                />
              </Space>
            </div>
          </div>
        </div>

        <StatsCards stats={stats} />

        {isDemo && (
          <Alert
            type="info"
            showIcon
            closable
            title={t("demo.bannerTitle")}
            description={t("demo.bannerDesc")}
            style={{ marginBottom: 24 }}
          />
        )}

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

        {/* Tabs: Grafik & Daftar */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          destroyOnHidden
          className="mb-2"
          items={[
            {
              key: "charts",
              label: (
                <span className="flex items-center gap-1.5">
                  <BarChartOutlined />
                  {t("app.tabCharts")}
                </span>
              ),
              children: (
                <div className="pb-2">
                  {/* Charts Row 1: Donut (saldo) + Pie (kategori) */}
                  <div className="mb-4 grid grid-cols-1 gap-4 md:mb-6 lg:grid-cols-2">
                    <BalanceDonutChart stats={stats} />
                    <CategoryPieChart cycles={chartData} />
                  </div>

                  {/* Charts Row 2: Allocation Bar + Daily Spending Line */}
                  <div className="mb-4 grid grid-cols-1 gap-4 md:mb-6 lg:grid-cols-2">
                    <AllocationBarChart cycles={chartData} />
                    <DailySpendingLineChart
                      purchases={visiblePurchases}
                      cycle={cycle}
                    />
                  </div>

                  {/* Charts Row 3: Savings comparison + Cumulative line */}
                  <div className="mb-4 grid grid-cols-1 gap-4 md:mb-6 lg:grid-cols-2">
                    <SavingsComparisonBarChart cycles={chartData} />
                    <CumulativeSavingsLineChart cycles={chartData} />
                  </div>
                </div>
              ),
            },
            {
              key: "top-facts",
              label: (
                <span className="flex items-center gap-1.5">
                  <BulbOutlined />
                  {t("app.tabFacts")}
                </span>
              ),
              children: (
                <div className="pb-2">
                  <div className="mb-4 md:mb-6">
                    <TopKeywordsInsights purchases={visiblePurchases} />
                  </div>
                </div>
              ),
            },
            {
              key: "records",
              label: (
                <span className="flex items-center gap-1.5">
                  <TableOutlined />
                  {t("app.tabRecords")}
                </span>
              ),
              children: (
                <div className="pb-2">
                  {/* Purchase Table */}
                  <PurchaseTable
                    purchases={visiblePurchases}
                    onCreate={handleOpenCreate}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                    onDeleteBulk={handleDeleteBulk}
                    onImported={() => {
                      if (!isDemo) refreshCycle(cycle);
                    }}
                    demoImport={isDemo ? handleDemoImport : undefined}
                  />

                  {/* Category Breakdown */}
                  <div className="mb-4 md:mb-6">
                    <CategoryBreakdown stats={stats} />
                  </div>
                </div>
              ),
            },
          ]}
        />

        {/* Modal */}
        <PurchaseFormModal
          open={formOpen}
          editingPurchase={editingPurchase}
          cycleLabel={cycleLabel}
          onClose={closeForm}
          onSaved={() => {
            if (!isDemo) refreshCycle(cycle);
          }}
          demoHandlers={
            isDemo
              ? { create: handleDemoCreate, update: handleDemoUpdate }
              : undefined
          }
        />
      </div>
    </div>
  );
}

"use client";

import {
  BarChartOutlined,
  LeftOutlined,
  RightOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { Alert, Button, DatePicker, Space, Tabs, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import ThemeToggle from "@/components/theme/ThemeToggle";
import LanguageToggle from "@/components/locale/LanguageToggle";
import { useLocale } from "@/components/locale/LocaleProvider";
import { useCycleConfig } from "@/components/config/CycleConfigProvider";
import CycleStartPicker from "@/components/config/CycleStartPicker";
import {
  deletePurchasesAction,
  deletePurchaseAction,
  getCyclePurchasesAction,
  getHistoricalPurchasesAction,
} from "@/server/actions";
import { computeCycleStats } from "@/helpers/stats";
import { buildCycleChartData } from "@/helpers/chartData";
import type { Purchase } from "@/models/types";
import {
  formatCycleLabel,
  getCycleInfo,
  getCurrentCycle,
  type CycleInfo,
} from "@/utils/cycleUtils";
import { formatIDR } from "@/utils/currency";
import CategoryBreakdown from "./CategoryBreakdown";
import NotificationBell from "./NotificationBell";
import PurchaseFormModal from "./PurchaseFormModal";
import PurchaseTable from "./PurchaseTable";
import RealtimeClock from "./RealtimeClock";
import StatsCards from "./StatsCards";
import AllocationBarChart from "./charts/AllocationBarChart";
import BalanceDonutChart from "./charts/BalanceDonutChart";
import CategoryPieChart from "./charts/CategoryPieChart";
import CumulativeSavingsLineChart from "./charts/CumulativeSavingsLineChart";
import SavingsComparisonBarChart from "./charts/SavingsComparisonBarChart";

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
}: Props) {
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

  const { t, locale } = useLocale();
  const { startDay } = useCycleConfig();

  // Derive info siklus dari pilihan bulan + startDay aktif (tidak perlu
  // setState di effect). Saat startDay berubah, range tanggal recompute otomatis.
  const cycle = useMemo(
    () => getCycleInfo(selectedYear, selectedMonthIndex, startDay),
    [selectedYear, selectedMonthIndex, startDay],
  );

  const cycleLabel = formatCycleLabel(cycle.year, cycle.monthIndex, locale);

  const stats = useMemo(() => computeCycleStats(purchases), [purchases]);
  const chartData = useMemo(
    () => buildCycleChartData(historical, locale),
    [historical, locale],
  );

  const editingPurchase = useMemo(
    () =>
      editingId ? (purchases.find((p) => p.id === editingId) ?? null) : null,
    [purchases, editingId],
  );

  /** Refetch pembelian untuk siklus tertentu dari server. */
  const refreshCycle = useCallback(async (targetCycle: CycleInfo) => {
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
  }, []);

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
      try {
        await deletePurchaseAction(id);
      } catch (err) {
        console.error("[BudgetDashboard] gagal menghapus:", err);
        await refreshCycle(cycle);
      }
    },
    [cycle, refreshCycle],
  );

  const handleDeleteBulk = useCallback(
    async (ids: string[]) => {
      // Optimistic: hapus dari state lokal dulu
      setPurchases((prev) => prev.filter((p) => !ids.includes(p.id)));
      try {
        await deletePurchasesAction(ids);
      } catch (err) {
        console.error("[BudgetDashboard] gagal menghapus bulk:", err);
        await refreshCycle(cycle);
      }
    },
    [cycle, refreshCycle],
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
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 md:px-8">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-4 md:mb-6 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <Title
              level={2}
              style={{ marginBottom: 4 }}
              className="text-lg! sm:text-2xl! md:text-3xl!"
            >
              {t("app.title")}
            </Title>
            <Paragraph
              type="secondary"
              style={{ marginBottom: 0 }}
              className="text-xs! sm:text-sm! md:text-base!"
            >
              {t("app.description")}{" "}
              <span className="font-medium text-indigo-500 dark:text-indigo-400">
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
                <CycleStartPicker />
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

                  {/* Charts Row 2: Allocation Bar */}
                  <div className="mb-4 md:mb-6">
                    <AllocationBarChart cycles={chartData} />
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
              key: "list",
              label: (
                <span className="flex items-center gap-1.5">
                  <TableOutlined />
                  {t("app.tabList")}
                </span>
              ),
              children: (
                <div className="pb-2">
                  {/* Purchase Table */}
                  <PurchaseTable
                    purchases={purchases}
                    onCreate={handleOpenCreate}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                    onDeleteBulk={handleDeleteBulk}
                    onImported={() => refreshCycle(cycle)}
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
          onSaved={() => refreshCycle(cycle)}
        />
      </div>
    </div>
  );
}

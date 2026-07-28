"use client";

import { PlusOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Alert, Button, DatePicker, Space, Typography } from "antd";
import { useCallback, useMemo, useState } from "react";
import dayjs from "dayjs";
import ThemeToggle from "@/components/theme/ThemeToggle";
import {
  deletePurchaseAction,
  getCyclePurchasesAction,
} from "@/server/actions";
import { computeCycleStats } from "@/helpers/stats";
import type { Purchase } from "@/models/types";
import {
  getCycleInfo,
  getCurrentCycle,
  shiftCycle,
  type CycleInfo,
} from "@/utils/cycleUtils";
import { formatIDR } from "@/utils/currency";
import CategoryBreakdown from "./CategoryBreakdown";
import PurchaseFormModal from "./PurchaseFormModal";
import PurchaseTable from "./PurchaseTable";
import RealtimeClock from "./RealtimeClock";
import StatsCards from "./StatsCards";

const { Title, Paragraph } = Typography;

interface Props {
  initialPurchases: Purchase[];
}

/**
 * Dashboard utama (Client Component) untuk Monthly Budget Tracker.
 * Mengelola state daftar pembelian + siklus bulanan + sinkron server.
 */
export default function BudgetDashboard({ initialPurchases }: Props) {
  const [cycle, setCycle] = useState<CycleInfo>(getCurrentCycle());
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const stats = useMemo(() => computeCycleStats(purchases), [purchases]);

  const editingPurchase = useMemo(
    () =>
      editingId ? (purchases.find((p) => p.id === editingId) ?? null) : null,
    [purchases, editingId],
  );

  /** Refetch pembelian untuk siklus tertentu dari server. */
  const refreshCycle = useCallback(async (targetCycle: CycleInfo) => {
    try {
      const fresh = await getCyclePurchasesAction(targetCycle);
      setPurchases(fresh);
    } catch (err) {
      console.error("[BudgetDashboard] gagal memuat pembelian:", err);
      setPurchases([]);
    }
  }, []);

  const handleCycleChange = useCallback(
    async (next: CycleInfo) => {
      setCycle(next);
      await refreshCycle(next);
    },
    [refreshCycle],
  );

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
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Title
              level={2}
              style={{ marginBottom: 4 }}
              className="text-xl! sm:text-2xl! md:text-3xl!"
            >
              Savings Goal Tracker
            </Title>
            <Paragraph
              type="secondary"
              style={{ marginBottom: 0 }}
              className="text-sm sm:text-base"
            >
              Pantau pengeluaran bulanan dengan sistem wadah.{" "}
              <span className="text-zinc-50">
                Siklus <b>{cycle.label}</b>:{" "}
                {dayjs(cycle.startDate).format("D MMM")} s/d{" "}
                {dayjs(cycle.endDate).format("D MMM YYYY")}
              </span>
            </Paragraph>
          </div>
          <div className="flex flex-col items-end gap-3">
            <RealtimeClock />
            <Space wrap>
              <ThemeToggle />
              <Button
                icon={<LeftOutlined />}
                onClick={() => handleCycleChange(shiftCycle(cycle, -1))}
              />
              <DatePicker
                picker="month"
                allowClear={false}
                value={dayjs(new Date(cycle.year, cycle.monthIndex, 1))}
                onChange={(v) => {
                  if (v) {
                    handleCycleChange(getCycleInfo(v.year(), v.month()));
                  }
                }}
                format="MMMM YYYY"
              />
              <Button
                icon={<RightOutlined />}
                onClick={() => handleCycleChange(shiftCycle(cycle, 1))}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenCreate}
              >
                Tambah Pembelian
              </Button>
            </Space>
          </div>
        </div>

        <StatsCards stats={stats} />

        {stats.overLimit && (
          <Alert
            type="error"
            showIcon
            message="Melebihi Limit Pengeluaran!"
            description={`Pengeluaran sudah ${formatIDR(stats.totalSpent)}, melebihi limit ${formatIDR(stats.spendingLimit)}. Selisih: ${formatIDR(Math.abs(stats.limitRemaining))}.`}
            className="mb-6"
          />
        )}

        {/* Category Breakdown */}
        <div className="mb-6">
          <CategoryBreakdown stats={stats} />
        </div>

        {/* Purchase Table */}
        <PurchaseTable
          purchases={purchases}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
        />

        {/* Modal */}
        <PurchaseFormModal
          open={formOpen}
          editingPurchase={editingPurchase}
          cycleLabel={cycle.label}
          onClose={closeForm}
          onSaved={() => refreshCycle(cycle)}
        />
      </div>
    </div>
  );
}

"use client";

import { LeftOutlined, PlusOutlined, RightOutlined } from "@ant-design/icons";
import { Alert, Button, Space, Tooltip, Typography } from "antd";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  getCycleTransactionsAction,
} from "@/utils/server/actions";
import { computeCycleStats } from "@/features/web/utils/stats";
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
import { formatIDR } from "@/utils/helpers";
import TransactionFormModal from "./TransactionFormModal";
import StatsCards from "./StatsCards";
import CategoryBreakdown from "./CategoryBreakdown";

const ChartLoading = () => (
  <div className="flex h-[300px] items-center justify-center">Loading…</div>
);

const DailySpendingLineChart = dynamic(
  () => import("./charts/DailySpendingLineChart"),
  { ssr: false, loading: ChartLoading },
);

const { Text } = Typography;

interface Props {
  initialTransactions: Transaction[];
  categories: BudgetCategory[];
  settings: UserSettings;
}

/**
 * Dashboard ringkas sesuai generate_web.md:
 * kartu Saldo / Pemasukan / Pengeluaran / Cash Flow, pengeluaran harian,
 * dan breakdown wadah. Catatan transaksi ada di halaman Transaksi.
 */
export default function DashboardView({
  initialTransactions,
  categories,
  settings,
}: Readonly<Props>) {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const editingTransaction = useMemo(
    () =>
      editingId
        ? (transactions.find((tr) => tr.id === editingId) ?? null)
        : null,
    [transactions, editingId],
  );

  const refreshCycle = useCallback(async (targetCycle: CycleInfo) => {
    try {
      setTransactions(await getCycleTransactionsAction(targetCycle));
    } catch (err) {
      console.error("[DashboardView] gagal memuat transaksi:", err);
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
      {/* Baris navigasi siklus + tombol tambah */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
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
        <Button
          type="primary"
          shape="round"
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

      <CategoryBreakdown stats={stats} />

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

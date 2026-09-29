"use client";

import { LeftOutlined, PlusOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Space, Tooltip, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  deleteTransactionAction,
  deleteTransactionsAction,
  getCycleTransactionsAction,
} from "@/utils/server/actions";
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
import TransactionFormModal from "./TransactionFormModal";
import TransactionTable from "./TransactionTable";
import ImportExportButtons from "./ImportExportButtons";

const { Text, Title } = Typography;

interface Props {
  initialTransactions: Transaction[];
  categories: BudgetCategory[];
  settings: UserSettings;
}

/**
 * Halaman Transaksi (generate_web.md): seluruh catatan transaksi siklus —
 * semua jenis (pemasukan/pengeluaran/transfer), pencarian, filter,
 * import/export, dan CRUD.
 */
export default function TransactionsView({
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
      console.error("[TransactionsView] gagal memuat transaksi:", err);
      setTransactions([]);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    refreshCycle(cycle).catch(() => {});
  }, [cycle, refreshCycle]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleDelete = useCallback(
    async (id: string) => {
      setTransactions((prev) => prev.filter((tr) => tr.id !== id));
      try {
        await deleteTransactionAction(id);
      } catch (err) {
        console.error("[TransactionsView] gagal menghapus:", err);
        await refreshCycle(cycle);
      }
    },
    [cycle, refreshCycle],
  );

  const handleDeleteBulk = useCallback(
    async (ids: string[]) => {
      setTransactions((prev) => prev.filter((tr) => !ids.includes(tr.id)));
      try {
        await deleteTransactionsAction(ids);
      } catch (err) {
        console.error("[TransactionsView] gagal menghapus bulk:", err);
        await refreshCycle(cycle);
      }
    },
    [cycle, refreshCycle],
  );

  return (
    <div className="mx-auto w-full max-w-350">
      <Title level={4}>{t("menu.transactions")}</Title>

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
        <Space size="small" wrap>
          <ImportExportButtons
            transactions={transactions}
            categories={categories}
            onImported={() => void refreshCycle(cycle)}
          />
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
        </Space>
      </div>

      <TransactionTable
        transactions={transactions}
        categories={categories}
        onEdit={(transaction) => {
          setEditingId(transaction.id);
          setFormOpen(true);
        }}
        onDelete={handleDelete}
        onDeleteBulk={handleDeleteBulk}
      />

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

"use client";

import { PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Empty,
  Popconfirm,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  deleteRecurringAction,
  deleteTransactionAction,
  deleteTransactionsAction,
  getCycleTransactionsAction,
  getRecurringRulesAction,
  toggleRecurringAction,
} from "@/utils/server/actions";
import type {
  BudgetCategory,
  RecurringRule,
  Transaction,
} from "@/features/web/types";
import { useCycle } from "@/features/web/hooks/cycle";
import {
  formatCycleLabel,
  type CycleInfo,
} from "@/features/web/utils/cycle";
import TransactionFormModal from "./TransactionFormModal";
import TransactionTable from "./TransactionTable";
import ImportExportButtons from "./ImportExportButtons";
import { formatIDR } from "@/utils/helpers";

const { Text } = Typography;

interface Props {
  initialTransactions: Transaction[];
  categories: BudgetCategory[];
}

/**
 * Halaman Transaksi (generate_web.md): seluruh catatan transaksi siklus —
 * semua jenis (pemasukan/pengeluaran/transfer), pencarian, filter,
 * import/export, CRUD, dan daftar transaksi berulang. Navigasi siklus
 * ada di navbar (DatePicker month).
 */
export default function TransactionsView({
  initialTransactions,
  categories,
}: Readonly<Props>) {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rules, setRules] = useState<RecurringRule[]>([]);

  /** Siklus aktif global (dipilih lewat DatePicker month di navbar). */
  const { cycle } = useCycle();

  const { t, locale } = useLocale();

  const cycleLabel = formatCycleLabel(cycle.year, cycle.monthIndex, locale);

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

  useEffect(() => {
    getRecurringRulesAction()
      .then(setRules)
      .catch(() => setRules([]));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const refreshRules = useCallback(async () => {
    try {
      setRules(await getRecurringRulesAction());
    } catch {
      // biarkan state lama
    }
  }, []);

  async function handleToggleRule(id: string, active: boolean) {
    // Optimistis: update UI dulu, rollback bila gagal.
    const prev = rules;
    setRules((rs) =>
      rs.map((r) => (r.id === id ? { ...r, active } : r)),
    );
    try {
      await toggleRecurringAction(id, active);
    } catch (err) {
      console.error("[TransactionsView] gagal toggle aturan:", err);
      setRules(prev);
    }
  }

  async function handleDeleteRule(id: string) {
    const prev = rules;
    setRules((rs) => rs.filter((r) => r.id !== id));
    try {
      await deleteRecurringAction(id);
    } catch (err) {
      console.error("[TransactionsView] gagal hapus aturan:", err);
      setRules(prev);
    }
  }

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
    <div className="mx-auto flex w-full max-w-350 flex-col">
      {/* Navigasi siklus ada di navbar (DatePicker month); sisakan aksi transaksi */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Space size="small" wrap>
          <ImportExportButtons
            transactions={transactions}
            categories={categories}
            onImported={() => void refreshCycle(cycle)}
          />
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

      {/* Aturan transaksi berulang (materialisasi otomatis per bulan) */}
      <Card
        variant="borderless"
        className="shadow-sm"
        style={{ marginTop: 16 }}
        title={<Text strong>{t("transactions.recurringTitle")}</Text>}
        styles={{ body: { padding: rules.length === 0 ? 0 : 16 } }}
      >
        {rules.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Empty description={t("transactions.recurringEmpty")} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rules.map((rule) => {
              const category = categories.find(
                (c) => c.id === rule.categoryId,
              );
              return (
                <div
                  key={rule.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1.5 bg-black/[0.03] dark:bg-white/[0.05]"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Tag
                      color={
                        rule.type === "INCOME" ? "green" : "red"
                      }
                      style={{ margin: 0 }}
                    >
                      {t(`form.type${rule.type.charAt(0)}${rule.type.slice(1).toLowerCase()}`)}
                    </Tag>
                    <Text strong ellipsis className="max-w-40">
                      {rule.name}
                    </Text>
                    <Text>{formatIDR(rule.amount, locale)}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t("transactions.recurringEvery", { n: rule.dayOfMonth })}
                    </Text>
                    {category && (
                      <Tag style={{ margin: 0 }}>{category.name}</Tag>
                    )}
                  </div>
                  <Space size="small">
                    <Tooltip title={t("transactions.recurringToggle")}>
                      <Switch
                        size="small"
                        checked={rule.active}
                        onChange={(checked) =>
                          void handleToggleRule(rule.id, checked)
                        }
                      />
                    </Tooltip>
                    <Popconfirm
                      title={t("transactions.deleteRecurringConfirm")}
                      okText={t("common.delete")}
                      okButtonProps={{ danger: true }}
                      cancelText={t("common.cancel")}
                      onConfirm={() => void handleDeleteRule(rule.id)}
                    >
                      <Button
                        type="text"
                        shape="circle"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={t("common.delete")}
                      />
                    </Popconfirm>
                  </Space>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <TransactionFormModal
        open={formOpen}
        editingTransaction={editingTransaction}
        categories={categories}
        cycleLabel={cycleLabel}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
        }}
        onSaved={() => {
          void refreshCycle(cycle);
          void refreshRules();
        }}
      />
    </div>
  );
}

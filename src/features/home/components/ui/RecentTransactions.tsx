"use client";

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Empty,
  Popconfirm,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCategory, getUnit } from "@/features/web/utils/categories";
import type {
  BudgetCategory,
  Transaction,
  TransactionType,
} from "@/features/web/types";
import { deleteTransactionAction } from "@/utils/server/actions";
import { formatIDR } from "@/utils/helpers";

const { Text } = Typography;

/** Jumlah transaksi terakhir yang ditampilkan (rekomendasi D1). */
const RECENT_COUNT = 5;

interface Props {
  /** Transaksi siklus aktif (dari slice stats dashboard). */
  transactions: Transaction[];
  categories: BudgetCategory[];
  /** D1: aksi edit cepat — buka TransactionFormModal mode edit. */
  onEdit: (transaction: Transaction) => void;
  /** D1: buka modal tambah transaksi dari empty state CTA. */
  onAddFirst?: () => void;
  /** Dipanggil setelah hapus sukses agar slice lain ikut memuat ulang. */
  onChanged: () => void;
}

const AMOUNT_STYLE: Record<
  TransactionType,
  { color: string; icon: string }
> = {
  EXPENSE: { color: "#ef4444", icon: "−" },
  INCOME: { color: "#16a34a", icon: "+" },
  TRANSFER: { color: "#2563eb", icon: "⇄" },
};

/**
 * D1 (rekomendasi_feature.md): daftar N transaksi terakhir siklus aktif
 * dengan aksi cepat edit (TransactionFormModal) + hapus (Popconfirm danger,
 * deleteTransactionAction) — pola optimistik sama dengan TransactionsView.
 */
export default function RecentTransactions({
  transactions,
  categories,
  onEdit,
  onAddFirst,
  onChanged,
}: Readonly<Props>) {
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const { t, locale } = useLocale();

  const rows = useMemo(
    () =>
      [...transactions]
        .filter((tr) => !hiddenIds.includes(tr.id))
        .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
        .slice(0, RECENT_COUNT),
    [transactions, hiddenIds],
  );

  async function handleDelete(id: string) {
    // Optimistik: sembunyikan dulu, rollback bila gagal (pola TransactionsView).
    setHiddenIds((ids) => [...ids, id]);
    try {
      await deleteTransactionAction(id);
      onChanged();
    } catch (err) {
      console.error("[RecentTransactions] gagal menghapus:", err);
      setHiddenIds((ids) => ids.filter((x) => x !== id));
    }
  }

  return (
    <Card
      variant="borderless"
      className="shadow-sm!"
      style={{ height: "100%" }}
      styles={{ body: { padding: 16 } }}
      size="small"
      title={<Text strong>{t("dashboard.recentTitle")}</Text>}
    >
      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Empty description={t("table.empty")}>
            {onAddFirst && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={onAddFirst}
              >
                {t("dashboard.firstTransaction")}
              </Button>
            )}
          </Empty>
        </div>
      ) : (
        <ul className="m-0 list-none space-y-1 p-0">
          {rows.map((tr) => {
            const unit = getUnit(categories, tr.subcategoryId ?? tr.categoryId);
            const parent = unit
              ? getCategory(categories, unit.categoryId)
              : undefined;
            const style = AMOUNT_STYLE[tr.type];
            return (
              <li
                key={tr.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Text ellipsis className="min-w-0! text-sm!">
                      {tr.name}
                    </Text>
                    {unit && (
                      <Tooltip title={parent?.name}>
                        <Tag
                          color={unit.color}
                          style={{ margin: 0, fontSize: 10 }}
                          className="shrink-0!"
                        >
                          {unit.name}
                          {tr.type === "TRANSFER" && tr.toCategoryId && (
                            <>
                              {" "}
                              → {getCategory(categories, tr.toCategoryId)?.name}
                            </>
                          )}
                        </Tag>
                      </Tooltip>
                    )}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {dayjs(tr.date).format("DD MMM YYYY, HH:mm")}
                  </Text>
                </div>
                <Text
                  strong
                  style={{ color: style.color, fontSize: 13 }}
                  className="shrink-0! tabular-nums!"
                >
                  {style.icon} {formatIDR(tr.amount, locale)}
                </Text>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="text"
                    shape="circle"
                    size="small"
                    icon={<EditOutlined />}
                    aria-label={t("table.editAria")}
                    onClick={() => onEdit(tr)}
                  />
                  <Popconfirm
                    title={t("table.deleteConfirm")}
                    okText={t("common.delete")}
                    okButtonProps={{ danger: true }}
                    cancelText={t("common.cancel")}
                    onConfirm={() => void handleDelete(tr.id)}
                  >
                    <Button
                      type="text"
                      shape="circle"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={t("table.deleteAria")}
                    />
                  </Popconfirm>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

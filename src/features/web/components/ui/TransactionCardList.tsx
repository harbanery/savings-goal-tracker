"use client";

import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Popconfirm, Tag, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import {
  getCategory,
  getUnit,
} from "@/features/web/utils/categories";
import type {
  BudgetCategory,
  Transaction,
} from "@/features/web/types";
import { formatIDR } from "@/utils/helpers";
import { useLocale } from "@/components/i18n/LocaleProvider";

const { Text } = Typography;

interface Props {
  transactions: Transaction[];
  categories: BudgetCategory[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

const AMOUNT_STYLE: Record<Transaction["type"], { color: string; icon: string }> =
  {
    EXPENSE: { color: "#ef4444", icon: "−" },
    INCOME: { color: "#16a34a", icon: "+" },
    TRANSFER: { color: "#2563eb", icon: "⇄" },
  };

/** Tampilan kartu per-transaksi untuk layar kecil (mobile). */
export default function TransactionCardList({
  transactions,
  categories,
  onEdit,
  onDelete,
}: Props) {
  const { t, locale } = useLocale();
  if (transactions.length === 0) {
    return (
      <Card variant="borderless" className="shadow-sm">
        <Empty description={t("table.empty")} />
      </Card>
    );
  }

  return (
    <div className="dynamic-scrollbar flex max-h-[60vh] min-h-0 flex-col gap-2 overflow-y-auto pr-1">
      {transactions.map((tr) => {
        const unit = getUnit(categories, tr.subcategoryId ?? tr.categoryId);
        const parent = unit ? getCategory(categories, unit.categoryId) : undefined;
        const style = AMOUNT_STYLE[tr.type];
        return (
          <Card
            key={tr.id}
            size="small"
            variant="borderless"
            className="shadow-sm"
            styles={{ body: { padding: "10px 14px" } }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div
                  className={`flex items-center gap-2 ${tr.note ? "pb-2" : "pb-1"}`}
                >
                  <Text strong style={{ fontSize: 13 }} className="truncate">
                    {tr.name}
                  </Text>
                  {unit && (
                    <Tooltip title={parent?.name}>
                      <Tag
                        color={unit.color}
                        style={{ margin: 0, fontSize: 10 }}
                      >
                        {unit.name}
                        {tr.type === "TRANSFER" && tr.toCategoryId && (
                          <> → {getCategory(categories, tr.toCategoryId)?.name}</>
                        )}
                      </Tag>
                    </Tooltip>
                  )}
                </div>
                {tr.note && (
                  <Text
                    type="secondary"
                    style={{ fontSize: 11 }}
                    className="block truncate"
                  >
                    {tr.note}
                  </Text>
                )}
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {dayjs(tr.date).format("DD MMM YYYY, HH:mm")}
                </Text>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Text strong style={{ color: style.color, fontSize: 13 }}>
                  {style.icon} {formatIDR(tr.amount, locale)}
                </Text>
                <div className="flex gap-1">
                  <Button
                    type="text"
                    shape="circle"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onEdit(tr)}
                  />
                  <Popconfirm
                    title={t("table.deleteConfirm")}
                    okText={t("common.delete")}
                    okButtonProps={{ danger: true }}
                    cancelText={t("common.cancel")}
                    onConfirm={() => onDelete(tr.id)}
                  >
                    <Button
                      type="text"
                      shape="circle"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

"use client";

import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Popconfirm, Tag, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { CATEGORY_MAP, getUnit } from "@/models/categories";
import type { Purchase } from "@/models/types";
import { formatIDR } from "@/utils/currency";
import { useLocale } from "@/components/locale/LocaleProvider";
import { pickText } from "@/components/locale/useTranslatedData";

const { Text } = Typography;

interface Props {
  purchases: Purchase[];
  onEdit: (purchase: Purchase) => void;
  onDelete: (id: string) => void;
}

/** Tampilan kartu per-pembelian untuk layar kecil (mobile). */
export default function PurchaseCardList({
  purchases,
  onEdit,
  onDelete,
}: Props) {
  const { t, locale } = useLocale();
  if (purchases.length === 0) {
    return (
      <Card variant="borderless" className="shadow-sm">
        <Empty description={t("table.empty")} />
      </Card>
    );
  }

  return (
    <div className="dynamic-scrollbar flex max-h-[60vh] min-h-0 flex-col gap-2 overflow-y-auto pr-1">
      {purchases.map((p) => {
        // Resolve unit/subkategori (legacy-aware) untuk tag + tooltip wadah.
        const unit = getUnit(p.categoryId);
        const parent = unit ? CATEGORY_MAP[unit.categoryId] : undefined;
        return (
          <Card
            key={p.id}
            size="small"
            variant="borderless"
            className="shadow-sm"
            styles={{ body: { padding: "10px 14px" } }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div
                  className={`flex items-center gap-2 ${p.note ? "pb-2" : "pb-1"}`}
                >
                  <Text strong style={{ fontSize: 13 }} className="truncate">
                    {p.name}
                  </Text>
                  {unit && (
                    <Tooltip
                      title={
                        parent ? pickText(parent.label, locale) : undefined
                      }
                    >
                      <Tag
                        color={unit.color}
                        style={{ margin: 0, fontSize: 10 }}
                        variant="solid"
                      >
                        {pickText(unit.label, locale)}
                      </Tag>
                    </Tooltip>
                  )}
                </div>
                {p.note && (
                  <Text
                    type="secondary"
                    style={{ fontSize: 11 }}
                    className="block truncate"
                  >
                    {p.note}
                  </Text>
                )}
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {dayjs(p.date).format("DD MMM YYYY, HH:mm")}
                </Text>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Text strong style={{ color: "#ef4444", fontSize: 13 }}>
                  {formatIDR(p.amount, locale)}
                </Text>
                <div className="flex gap-1">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onEdit(p)}
                  />
                  <Popconfirm
                    title={t("table.deleteConfirm")}
                    okText={t("common.delete")}
                    okButtonProps={{ danger: true }}
                    cancelText={t("common.cancel")}
                    onConfirm={() => onDelete(p.id)}
                  >
                    <Button
                      type="text"
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

"use client";

import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Popconfirm, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { CATEGORY_MAP } from "@/models/categories";
import type { Purchase } from "@/models/types";
import { formatIDR } from "@/utils/currency";

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
  if (purchases.length === 0) {
    return (
      <Card variant="borderless" className="shadow-sm">
        <Empty description="Belum ada pembelian di siklus ini" />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {purchases.map((p) => {
        const cat = CATEGORY_MAP[p.categoryId];
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
                <div className="flex items-center gap-2">
                  <Text strong style={{ fontSize: 13 }} className="truncate">
                    {p.name}
                  </Text>
                  {cat && (
                    <Tag
                      color={cat.color}
                      style={{ margin: 0, fontSize: 10 }}
                    >
                      {cat.label}
                    </Tag>
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
                  {formatIDR(p.amount)}
                </Text>
                <div className="flex gap-1">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onEdit(p)}
                  />
                  <Popconfirm
                    title="Hapus pembelian ini?"
                    okText="Hapus"
                    okButtonProps={{ danger: true }}
                    cancelText="Batal"
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

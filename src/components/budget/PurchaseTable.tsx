"use client";

import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Empty,
  Popconfirm,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { CATEGORY_MAP } from "@/models/categories";
import type { Purchase } from "@/models/types";
import { formatIDR } from "@/utils/currency";
import ImportExportButtons from "./ImportExportButtons";
import PurchaseCardList from "./PurchaseCardList";

const { Text } = Typography;

interface Props {
  purchases: Purchase[];
  onEdit: (purchase: Purchase) => void;
  onDelete: (id: string) => void;
  onImported: () => void;
}

interface RowData {
  key: string;
  purchase: Purchase;
}

/** Tabel daftar pembelian dengan kolom nama, kategori, jumlah, tanggal, aksi. */
export default function PurchaseTable({ purchases, onEdit, onDelete, onImported }: Props) {
  const columns: ColumnsType<RowData> = [
    {
      title: "Pembelian",
      key: "name",
      dataIndex: ["purchase", "name"],
      ellipsis: true,
      render: (name: string, record: RowData) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {name}
          </Text>
          {record.purchase.note && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.purchase.note}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Kategori",
      key: "category",
      width: 140,
      render: (_: unknown, record: RowData) => {
        const cat = CATEGORY_MAP[record.purchase.categoryId];
        if (!cat) return <Text type="secondary">-</Text>;
        return (
          <Tag color={cat.color} style={{ margin: 0, fontSize: 11 }}>
            {cat.label}
          </Tag>
        );
      },
    },
    {
      title: "Jumlah",
      key: "amount",
      width: 140,
      align: "right",
      sorter: (a, b) => a.purchase.amount - b.purchase.amount,
      render: (_: unknown, record: RowData) => (
        <Text strong style={{ color: "#ef4444" }}>
          - {formatIDR(record.purchase.amount)}
        </Text>
      ),
    },
    {
      title: "Tanggal",
      key: "date",
      width: 130,
      sorter: (a, b) => a.purchase.date.localeCompare(b.purchase.date),
      render: (_: unknown, record: RowData) => (
        <Tooltip title={dayjs(record.purchase.date).format("HH:mm")}>
          <Text style={{ fontSize: 12 }}>
            {dayjs(record.purchase.date).format("DD MMM YYYY")}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 90,
      align: "center",
      fixed: "end",
      render: (_: unknown, record: RowData) => (
        <div className="flex justify-center gap-1">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record.purchase)}
            aria-label="Edit pembelian"
          />
          <Popconfirm
            title="Hapus pembelian ini?"
            okText="Hapus"
            okButtonProps={{ danger: true }}
            cancelText="Batal"
            onConfirm={() => onDelete(record.purchase.id)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label="Hapus pembelian"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const dataSource: RowData[] = purchases.map((p) => ({
    key: p.id,
    purchase: p,
  }));

  return (
    <Card
      variant="borderless"
      className="shadow-sm"
      title={<Text strong>Daftar Pembelian</Text>}
      extra={
        <ImportExportButtons purchases={purchases} onImported={onImported} />
      }
      style={{ marginBottom: 24 }}
      styles={{ body: { padding: 0 } }}
    >
      {purchases.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Empty description="Belum ada pembelian di siklus ini" />
        </div>
      ) : (
        <>
          {/* Tabel untuk tablet & desktop */}
          <div className="hidden sm:block">
            <Table
              columns={columns}
              dataSource={dataSource}
              pagination={{ pageSize: 10, size: "small" }}
              size="small"
              scroll={{ x: 600 }}
            />
          </div>
          {/* Kartu untuk mobile */}
          <div className="block p-3 sm:hidden">
            <PurchaseCardList
              purchases={purchases}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </>
      )}
    </Card>
  );
}

"use client";

import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Empty,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { CATEGORY_MAP } from "@/models/categories";
import type { Purchase } from "@/models/types";
import { formatIDR } from "@/utils/currency";
import { useLocale } from "@/components/locale/LocaleProvider";
import { pickText } from "@/components/locale/useTranslatedData";
import ImportExportButtons from "./ImportExportButtons";
import PurchaseCardList from "./PurchaseCardList";

const { Text } = Typography;

interface Props {
  purchases: Purchase[];
  onCreate: () => void;
  onEdit: (purchase: Purchase) => void;
  onDelete: (id: string) => void;
  onDeleteBulk: (ids: string[]) => void;
  onImported: () => void;
}

interface RowData {
  key: string;
  purchase: Purchase;
}

/** Tabel daftar pembelian dengan kolom nama, kategori, jumlah, tanggal, aksi. */
export default function PurchaseTable({
  purchases,
  onCreate,
  onEdit,
  onDelete,
  onDeleteBulk,
  onImported,
}: Props) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const { t, locale } = useLocale();

  const dataSource: RowData[] = useMemo(
    () => purchases.map((p) => ({ key: p.id, purchase: p })),
    [purchases],
  );

  const rowSelection: TableProps<RowData>["rowSelection"] = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  const hasSelected = selectedRowKeys.length > 0;

  const handleBulkDelete = () => {
    onDeleteBulk(selectedRowKeys.map(String));
    setSelectedRowKeys([]);
  };

  const columns: ColumnsType<RowData> = [
    {
      title: t("table.colPurchase"),
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
      title: t("table.colCategory"),
      key: "category",
      width: 140,
      render: (_: unknown, record: RowData) => {
        const cat = CATEGORY_MAP[record.purchase.categoryId];
        if (!cat) return <Text type="secondary">-</Text>;
        return (
          <Tag
            color={cat.color}
            style={{ margin: 0, fontSize: 11 }}
            variant="solid"
          >
            {pickText(cat.label, locale)}
          </Tag>
        );
      },
    },
    {
      title: t("table.colAmount"),
      key: "amount",
      width: 140,
      align: "right",
      sorter: (a, b) => a.purchase.amount - b.purchase.amount,
      render: (_: unknown, record: RowData) => (
        <Text strong style={{ color: "#ef4444" }}>
          - {formatIDR(record.purchase.amount, locale)}
        </Text>
      ),
    },
    {
      title: t("table.colDate"),
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
      title: t("table.colAction"),
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
            aria-label={t("table.editAria")}
          />
          <Popconfirm
            title={t("table.deleteConfirm")}
            okText={t("common.delete")}
            okButtonProps={{ danger: true }}
            cancelText={t("common.cancel")}
            onConfirm={() => onDelete(record.purchase.id)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label={t("table.deleteAria")}
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <Card
      variant="borderless"
      className="shadow-sm"
      title={
        <Space>
          {hasSelected && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("table.selected", { n: selectedRowKeys.length })}
            </Text>
          )}
        </Space>
      }
      extra={
        <Space size="medium" wrap>
          {hasSelected && (
            <Popconfirm
              title={t("table.deleteBulkConfirm", { n: selectedRowKeys.length })}
              okText={t("common.delete")}
              okButtonProps={{ danger: true }}
              cancelText={t("common.cancel")}
              onConfirm={handleBulkDelete}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                <span className="hidden md:inline">{t("common.delete")}</span>
              </Button>
            </Popconfirm>
          )}
          <ImportExportButtons purchases={purchases} onImported={onImported} />
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            <span className="hidden md:inline">{t("table.addPurchase")}</span>
          </Button>
        </Space>
      }
      style={{ marginBottom: 24 }}
      styles={{ body: { padding: 0 } }}
    >
      {purchases.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Empty description={t("table.empty")} />
        </div>
      ) : (
        <>
          {/* Tabel untuk tablet & desktop */}
          <div className="hidden sm:block">
            <Table
              rowSelection={rowSelection}
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

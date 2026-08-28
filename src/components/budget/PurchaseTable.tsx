"use client";

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Empty,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import {
  CATEGORIES,
  CATEGORY_MAP,
  getUnit,
  resolveUnitId,
  UNITS,
} from "@/models/categories";
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
  const [searchText, setSearchText] = useState("");
  const [filterSubcategory, setFilterSubcategory] = useState<string | null>(
    null,
  );
  const { t, locale } = useLocale();

  /** Opsi filter subkategori, tergrup per kategori/wadah. */
  const subcategoryFilterOptions = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        label: pickText(c.label, locale),
        options: UNITS.filter((u) => u.categoryId === c.id).map((u) => ({
          value: u.id,
          label: u.label[locale] ?? u.label.id,
        })),
      })),
    [locale],
  );

  /** Filter purchases berdasarkan search text & subkategori (legacy-aware). */
  const filteredPurchases = useMemo(() => {
    let result = purchases;
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.note.toLowerCase().includes(q),
      );
    }
    if (filterSubcategory) {
      result = result.filter(
        (p) => resolveUnitId(p.categoryId) === filterSubcategory,
      );
    }
    return result;
  }, [purchases, searchText, filterSubcategory]);

  const dataSource: RowData[] = useMemo(
    () => filteredPurchases.map((p) => ({ key: p.id, purchase: p })),
    [filteredPurchases],
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
      title: t("table.colSubcategory"),
      key: "category",
      width: 180,
      render: (_: unknown, record: RowData) => {
        const unit = getUnit(record.purchase.categoryId);
        if (!unit) return <Text type="secondary">-</Text>;
        const cat = CATEGORY_MAP[unit.categoryId];
        return (
          <Tooltip
            title={cat ? pickText(cat.label, locale) : unit.categoryId}
          >
            <Tag
              color={unit.color}
              style={{ margin: 0, fontSize: 11 }}
              variant="solid"
            >
              {pickText(unit.label, locale)}
            </Tag>
          </Tooltip>
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
        <Space size="small" wrap>
          {/* Search & Filter bar laptop */}
          {purchases.length > 0 && (
            <div className="hidden lg:flex flex-col gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center">
              <Input
                prefix={<SearchOutlined className="text-zinc-400" />}
                placeholder={t("table.searchPlaceholder")}
                allowClear
                size="small"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ maxWidth: 280 }}
              />
              <Select
                placeholder={t("table.filterSubcategoryPlaceholder")}
                allowClear
                size="small"
                value={filterSubcategory}
                onChange={(val) => setFilterSubcategory(val ?? null)}
                style={{ minWidth: 200 }}
                options={subcategoryFilterOptions}
              />
            </div>
          )}
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
              title={t("table.deleteBulkConfirm", {
                n: selectedRowKeys.length,
              })}
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
      {/* Search & Filter bar laptop */}
      {purchases.length > 0 && (
        <div className="flex lg:hidden flex-row items-center gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <Input
            prefix={<SearchOutlined className="text-zinc-400" />}
            placeholder={t("table.searchPlaceholder")}
            allowClear
            size="small"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: "60%" }}
          />
          <Select
            placeholder={t("table.filterSubcategoryPlaceholder")}
            allowClear
            size="small"
            value={filterSubcategory}
            onChange={(val) => setFilterSubcategory(val ?? null)}
            style={{ minWidth: "40%" }}
            options={subcategoryFilterOptions}
          />
        </div>
      )}

      {purchases.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Empty description={t("table.empty")} />
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Empty description={t("table.noMatch")} />
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
              purchases={filteredPurchases}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </>
      )}
    </Card>
  );
}

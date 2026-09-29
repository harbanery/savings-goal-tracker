"use client";

import {
  DeleteOutlined,
  EditOutlined,
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
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  buildUnits,
  getCategory,
  getUnit,
} from "@/features/web/utils/categories";
import type {
  BudgetCategory,
  Transaction,
  TransactionType,
} from "@/features/web/types";
import { formatIDR } from "@/utils/helpers";
import TransactionCardList from "./TransactionCardList";

const { Text } = Typography;

/**
 * Tinggi area scroll body tabel: h-screen (100dvh) dikurangi tinggi
 * komponen lain di sekitarnya — header/navbar (~57px), footer (~80px),
 * padding konten (32px), baris toolbar siklus + tombol (~48px + 24px
 * margin), card head (~57px), table header (~39px), pagination (~40px),
 * dan sisa border — dengan batas minimum agar tetap usable di layar
 * pendek.
 */
const TABLE_SCROLL_Y = "max(240px, calc(100dvh - 300px))";

interface Props {
  transactions: Transaction[];
  categories: BudgetCategory[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onDeleteBulk: (ids: string[]) => void;
}

interface RowData {
  key: string;
  transaction: Transaction;
}

const TYPE_TAG: Record<TransactionType, { color: string; icon: string }> = {
  EXPENSE: { color: "red", icon: "−" },
  INCOME: { color: "green", icon: "+" },
  TRANSFER: { color: "blue", icon: "⇄" },
};

/** Tabel daftar transaksi multi-tipe dengan filter & aksi. */
export default function TransactionTable({
  transactions,
  categories,
  onEdit,
  onDelete,
  onDeleteBulk,
}: Props) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState<TransactionType | "ALL">("ALL");
  const [filterUnit, setFilterUnit] = useState<string | null>(null);
  const { t, locale } = useLocale();

  const units = useMemo(() => buildUnits(categories), [categories]);

  /** Opsi filter unit, tergrup per kategori/wadah. */
  const unitFilterOptions = useMemo(
    () =>
      categories
        .map((c) => ({
          label: c.name,
          options: units
            .filter((u) => u.categoryId === c.id)
            .map((u) => ({ value: u.id, label: u.name })),
        }))
        .filter((g) => g.options.length > 0),
    [categories, units],
  );

  /** Opsi filter jenis transaksi. */
  const typeFilterOptions = useMemo(
    () => [
      { value: "ALL", label: t("table.filterAll") },
      { value: "EXPENSE", label: t("form.typeExpense") },
      { value: "INCOME", label: t("form.typeIncome") },
      { value: "TRANSFER", label: t("form.typeTransfer") },
    ],
    [t],
  );

  const filtered = useMemo(() => {
    let result = transactions;
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(
        (tr) =>
          tr.name.toLowerCase().includes(q) ||
          tr.note.toLowerCase().includes(q),
      );
    }
    if (filterType !== "ALL") {
      result = result.filter((tr) => tr.type === filterType);
    }
    if (filterUnit) {
      const unit = getUnit(categories, filterUnit);
      result = result.filter((tr) => {
        if (unit && tr.subcategoryId) return tr.subcategoryId === filterUnit;
        return unit ? tr.categoryId === unit.categoryId : false;
      });
    }
    return result;
  }, [transactions, categories, searchText, filterType, filterUnit]);

  const dataSource: RowData[] = useMemo(
    () => filtered.map((tr) => ({ key: tr.id, transaction: tr })),
    [filtered],
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
      dataIndex: ["transaction", "name"],
      ellipsis: true,
      render: (name: string, record: RowData) => (
        <div>
          <span className="flex items-center gap-1.5">
            <Text strong style={{ fontSize: 13 }} ellipsis>
              {name}
            </Text>
            {record.transaction.recurringId && (
              <Tag style={{ margin: 0, fontSize: 11 }}>
                {t("transactions.recurringTag")}
              </Tag>
            )}
          </span>
          {record.transaction.note && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.transaction.note}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t("table.colType"),
      key: "type",
      width: 110,
      render: (_: unknown, record: RowData) => (
        <Tag
          color={TYPE_TAG[record.transaction.type].color}
          style={{ margin: 0, fontSize: 11 }}
        >
          {t(
            `form.type${record.transaction.type.charAt(0)}${record.transaction.type.slice(1).toLowerCase()}`,
          )}
        </Tag>
      ),
    },
    {
      title: t("table.colSubcategory"),
      key: "category",
      width: 200,
      render: (_: unknown, record: RowData) => {
        const tr = record.transaction;
        const unit = getUnit(categories, tr.subcategoryId ?? tr.categoryId);
        if (!unit) return <Text type="secondary">-</Text>;
        const cat = getCategory(categories, unit.categoryId);
        return (
          <Tooltip title={cat?.name ?? unit.categoryId}>
            <Tag color={unit.color} style={{ margin: 0, fontSize: 11 }}>
              {unit.name}
              {tr.type === "TRANSFER" && tr.toCategoryId && (
                <>
                  {" → "}
                  {getCategory(categories, tr.toCategoryId)?.name ?? ""}
                </>
              )}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: t("table.colAmount"),
      key: "amount",
      width: 150,
      align: "right",
      sorter: (a, b) => a.transaction.amount - b.transaction.amount,
      render: (_: unknown, record: RowData) => {
        const { color, icon } = TYPE_TAG[record.transaction.type];
        return (
          <Text
            strong
            style={{
              color:
                color === "red"
                  ? "#ef4444"
                  : color === "green"
                    ? "#16a34a"
                    : undefined,
            }}
          >
            {icon} {formatIDR(record.transaction.amount, locale)}
          </Text>
        );
      },
    },
    {
      title: t("table.colDate"),
      key: "date",
      width: 130,
      sorter: (a, b) => a.transaction.date.localeCompare(b.transaction.date),
      render: (_: unknown, record: RowData) => (
        <Tooltip title={dayjs(record.transaction.date).format("HH:mm")}>
          <Text style={{ fontSize: 12 }}>
            {dayjs(record.transaction.date).format("DD MMM YYYY")}
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
            shape="circle"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record.transaction)}
            aria-label={t("table.editAria")}
          />
          <Popconfirm
            title={t("table.deleteConfirm")}
            okText={t("common.delete")}
            okButtonProps={{ danger: true }}
            cancelText={t("common.cancel")}
            onConfirm={() => onDelete(record.transaction.id)}
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
      ),
    },
  ];

  const searchBar = (
    <div className="flex flex-row flex-wrap items-center gap-2">
      <Input
        prefix={<SearchOutlined className="text-zinc-400" />}
        placeholder={t("table.searchPlaceholder")}
        allowClear
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ maxWidth: 220 }}
      />
      <Select
        value={filterType}
        onChange={(v) => setFilterType(v as TransactionType | "ALL")}
        options={typeFilterOptions}
        style={{ minWidth: 130 }}
        aria-label={t("table.colType")}
      />
      <Select
        value={filterUnit ?? undefined}
        onChange={(v) => setFilterUnit(v ?? null)}
        options={unitFilterOptions}
        placeholder={t("table.filterAllUnits")}
        allowClear
        showSearch
        optionFilterProp="label"
        style={{ minWidth: 160 }}
        aria-label={t("table.colSubcategory")}
      />
    </div>
  );

  return (
    <Card
      variant="borderless"
      className="shadow-sm"
      title={searchBar}
      extra={
        hasSelected ? (
          <Space size="medium" wrap>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("table.selected", { n: selectedRowKeys.length })}
            </Text>
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
          </Space>
        ) : null
      }
      style={{ marginBottom: 24 }}
      styles={{ body: { padding: 0 } }}
    >
      {transactions.length === 0 ? (
        <div
          style={{
            height: TABLE_SCROLL_Y,
          }}
          className="flex items-center justify-center py-12"
        >
          <Empty description={t("table.empty")} />
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            height: TABLE_SCROLL_Y,
          }}
          className="flex items-center justify-center py-12"
        >
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
              scroll={{ y: TABLE_SCROLL_Y }}
            />
          </div>
          {/* Kartu untuk mobile */}
          <div className="block p-3 sm:hidden">
            <TransactionCardList
              transactions={filtered}
              categories={categories}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </>
      )}
    </Card>
  );
}

"use client";

import {
  BankOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  PlusOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  ColorPicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { BudgetCategory, WalletType } from "@/features/web/types";
import {
  createCategoryAction,
  deleteCategoryAction,
  getFinanceBundleAction,
  updateCategoryAction,
} from "@/utils/server/actions";
import { formatIDR } from "@/utils/helpers";

const { Text } = Typography;

interface Props {
  initialCategories: BudgetCategory[];
}

const PRESET_COLORS = [
  "#4f46e5",
  "#0891b2",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#db2777",
  "#475569",
];

interface CategoryFormValues {
  name: string;
  color: string;
  allocation: number;
  walletType: WalletType;
}

interface CategoryRow {
  key: string;
  category: BudgetCategory;
}

/** Opsi jenis dompet yang bisa DIBUAT user (Cash bawaan, bukan dibuat). */
function useCreatableWalletTypeOptions() {
  const { t } = useLocale();
  return [
    { value: "BANK", label: t("finance.walletBank"), icon: <BankOutlined /> },
    {
      value: "E_WALLET",
      label: t("finance.walletEwallet"),
      icon: <WalletOutlined />,
    },
  ];
}

/**
 * Halaman Keuangan: tabel wadah (CRUD penuh) dengan segmented filter per
 * jenis dompet (Semua / Bank / E-Wallet / Cash). Wadah "Cash" (CASH) adalah
 * wadah bawaan — tampil tanpa aksi edit/hapus.
 * Subkategori wadah ada di halaman Kebutuhan; Budget & Target halaman sendiri.
 */
export default function WalletsView({ initialCategories }: Props) {
  const { t, locale } = useLocale();
  const { message } = App.useApp();
  const creatableTypes = useCreatableWalletTypeOptions();

  const [categories, setCategories] = useState(initialCategories);
  const [reloadKey, setReloadKey] = useState(0);
  const [typeFilter, setTypeFilter] = useState<WalletType>("CASH");

  const [categoryForm] = Form.useForm<CategoryFormValues>();

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null);
  const [catSaving, setCatSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const bundle = await getFinanceBundleAction();
      setCategories(bundle.categories);
    } catch {
      // biarkan state lama
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (reloadKey > 0) void refresh();
  }, [reloadKey, refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleCategorySubmit(values: CategoryFormValues) {
    setCatSaving(true);
    try {
      if (editingCat) {
        await updateCategoryAction(editingCat.id, values);
      } else {
        await createCategoryAction(values);
      }
      message.success(t("settings.saved"));
      setCatModalOpen(false);
      setEditingCat(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("settings.saveFailed"),
      );
    } finally {
      setCatSaving(false);
    }
  }

  async function handleDeleteCategory(cat: BudgetCategory) {
    try {
      await deleteCategoryAction(cat.id);
      message.success(t("settings.saved"));
      setReloadKey((k) => k + 1);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("settings.saveFailed"),
      );
    }
  }

  /** Baris tabel wadah (difilter per jenis dompet lewat segmented). */
  const typeFiltered = categories.filter((c) => c.walletType === typeFilter);
  const categoryDataSource: CategoryRow[] = typeFiltered.map((c) => ({
    key: c.id,
    category: c,
  }));

  /** Tag jenis dompet (Bank / E-Wallet / Cash). */
  function renderWalletType(type: WalletType) {
    if (type === "CASH") {
      return (
        <Tag>
          <span className="flex items-center gap-1">
            <DollarOutlined />
            {t("finance.walletCash")}
          </span>
        </Tag>
      );
    }
    const opt = creatableTypes.find((o) => o.value === type);
    return (
      <Tag>
        <span className="flex items-center gap-1">
          {opt?.icon}
          {opt?.label ?? type}
        </span>
      </Tag>
    );
  }

  const categoryColumns: ColumnsType<CategoryRow> = [
    {
      title: t("settings.categoryName"),
      key: "name",
      render: (_: unknown, { category }: CategoryRow) => (
        <div className="flex items-center gap-2">
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: category.color,
              flexShrink: 0,
            }}
          />
          <Text strong>{category.name}</Text>
        </div>
      ),
    },
    {
      title: t("finance.walletType"),
      key: "walletType",
      width: 130,
      render: (_: unknown, { category }: CategoryRow) =>
        renderWalletType(category.walletType),
    },
    {
      title: t("settings.allocation"),
      key: "allocation",
      width: 140,
      align: "right",
      render: (_: unknown, { category }: CategoryRow) => (
        <Text>{formatIDR(category.allocation, locale)}</Text>
      ),
    },
    {
      title: t("table.colAction"),
      key: "action",
      width: 90,
      align: "center",
      render: (_: unknown, { category }: CategoryRow) =>
        category.walletType === "CASH" ? (
          // Wadah Cash bawaan: tanpa aksi edit/hapus.
          <Tooltip title={t("finance.walletCashBuiltIn")}>
            <Tag style={{ margin: 0 }}>{t("finance.walletCashBuiltInTag")}</Tag>
          </Tooltip>
        ) : (
          <div className="flex justify-center gap-1">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingCat(category);
                categoryForm.setFieldsValue({
                  name: category.name,
                  color: category.color,
                  allocation: category.allocation,
                  walletType: category.walletType,
                });
                setCatModalOpen(true);
              }}
              aria-label={t("settings.editCategory")}
            />
            <Popconfirm
              title={t("settings.deleteCategoryConfirm")}
              okText={t("common.delete")}
              okButtonProps={{ danger: true }}
              cancelText={t("common.cancel")}
              onConfirm={() => void handleDeleteCategory(category)}
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
          </div>
        ),
    },
  ];

  return (
    <div className="w-full">
      {/* Toolbar di luar table: segmented jenis dompet + tombol tambah wadah.
          Tanpa opsi "Semua" — hanya Bank / E-Wallet / Cash (default Cash). */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Segmented
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as WalletType)}
          options={[
            ...creatableTypes.map((o) => ({
              value: o.value,
              label: (
                <span className="flex items-center gap-1">
                  {o.icon}
                  <span className="hidden sm:inline">{o.label}</span>
                </span>
              ),
            })),
            {
              value: "CASH",
              label: (
                <span className="flex items-center gap-1">
                  <DollarOutlined />
                  <span className="hidden sm:inline">
                    {t("finance.walletCash")}
                  </span>
                </span>
              ),
            },
          ]}
          aria-label={t("finance.walletType")}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingCat(null);
            categoryForm.resetFields();
            setCatModalOpen(true);
          }}
        >
          {t("settings.addCategory")}
        </Button>
      </div>

      {/* Tabel wadah (hanya wadah — subkategori ada di halaman Kebutuhan).
          Body diberi padding agar tabel tidak menempel tepi card. */}
      <Card
        variant="borderless"
        className="shadow-sm"
        title={<Text strong>{t("categories.wadahTitle")}</Text>}
        styles={{ body: { padding: 16 } }}
      >
        {typeFiltered.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Empty description={t("settings.categoriesEmpty")} />
          </div>
        ) : (
          <Table
            columns={categoryColumns}
            dataSource={categoryDataSource}
            size="small"
            pagination={false}
          />
        )}
      </Card>

      {/* Modal wadah (hanya Bank / E-Wallet — Cash bawaan) */}
      <Modal
        open={catModalOpen}
        title={
          editingCat ? t("settings.editCategory") : t("settings.addCategory")
        }
        onCancel={() => {
          setCatModalOpen(false);
          setEditingCat(null);
        }}
        footer={null}
        destroyOnHidden
        centered
        width={{ xs: "92%", sm: 480 }}
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleCategorySubmit}
          initialValues={{
            color: PRESET_COLORS[0],
            allocation: 0,
            walletType: "E_WALLET",
          }}
        >
          <Form.Item
            name="name"
            label={t("settings.categoryName")}
            rules={[{ required: true }]}
          >
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item
            name="walletType"
            label={t("finance.walletType")}
            rules={[{ required: true }]}
          >
            <Select
              disabled={editingCat !== null}
              options={creatableTypes.map((o) => ({
                value: o.value,
                label: (
                  <span className="flex items-center gap-2">
                    {o.icon}
                    {o.label}
                  </span>
                ),
              }))}
            />
          </Form.Item>
          <Form.Item
            name="color"
            label={t("settings.categoryColor")}
            rules={[{ required: true }]}
          >
            <ColorPicker
              presets={[
                {
                  label: t("settings.colorPresets"),
                  colors: PRESET_COLORS,
                },
              ]}
              showText
            />
          </Form.Item>
          <Form.Item
            name="allocation"
            label={t("settings.allocation")}
            extra={t("finance.limitHint")}
            rules={[{ required: true }]}
          >
            <InputNumber<number>
              style={{ width: "100%" }}
              addonBefore="Rp"
              min={0}
              step={50000}
              formatter={(v) =>
                v === undefined || v === null
                  ? ""
                  : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
              }
              parser={(v) => Number((v ?? "").replace(/\D/g, "") || 0)}
            />
          </Form.Item>
          <div className="mt-2 flex justify-end gap-2">
            <Button
              onClick={() => {
                setCatModalOpen(false);
                setEditingCat(null);
              }}
              icon={<CloseOutlined />}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={catSaving}
              icon={<CheckOutlined />}
            >
              {t("settings.save")}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

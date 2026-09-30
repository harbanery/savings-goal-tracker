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
  Select,
  Tag,
  Tooltip,
  Typography,
} from "antd";
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
  color: string | { toHexString(): string };
  allocation: number;
  walletType: WalletType;
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
 * Halaman Keuangan: daftar wadah sebagai grid card (semua jenis dompet
 * sekaligus — tanpa filter). Wadah "Cash" (CASH) adalah wadah bawaan:
 * hanya batas & warnanya yang bisa diubah, tidak bisa dihapus.
 * Subkategori wadah ada di halaman Kebutuhan; Budget & Target halaman sendiri.
 */
export default function WalletsView({ initialCategories }: Props) {
  const { t, locale } = useLocale();
  const { message } = App.useApp();
  const creatableTypes = useCreatableWalletTypeOptions();

  const [categories, setCategories] = useState(initialCategories);
  const [reloadKey, setReloadKey] = useState(0);

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

  /** antd ColorPicker menyimpan objek Color di form — server action butuh
   *  string hex biasa (objek class tidak bisa diserialisasi ke server). */
  function toHexColor(color: CategoryFormValues["color"]): string {
    if (typeof color === "string") return color;
    return color?.toHexString?.() ?? "#6366f1";
  }

  async function handleCategorySubmit(values: CategoryFormValues) {
    setCatSaving(true);
    try {
      // Wadah Cash bawaan: nama & jenis terkunci — kirim hanya batas & warna.
      const isCash = editingCat?.walletType === "CASH";
      const payload = {
        name: isCash ? undefined : values.name,
        color: toHexColor(values.color),
        allocation: values.allocation,
        walletType: isCash ? undefined : values.walletType,
      };
      if (editingCat) {
        await updateCategoryAction(editingCat.id, payload);
      } else {
        await createCategoryAction({
          ...payload,
          name: values.name,
          walletType: values.walletType,
        });
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

  /** Semua wadah tampil sekaligus (tanpa filter jenis dompet). */
  const visibleCategories = categories;

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

  /** Label batas wadah (batas 0 = tanpa batas). Cash ikut dibatasi bila
      batasnya diatur — batas hanya berlaku untuk pengeluaran. */
  function renderLimit(category: BudgetCategory) {
    if (category.allocation <= 0) {
      return <Text type="secondary">{t("finance.noLimit")}</Text>;
    }
    return (
      <Text>
        {t("settings.allocation")}:{" "}
        {formatIDR(category.allocation, locale)}
      </Text>
    );
  }

  return (
    <div className="w-full">
      {/* Toolbar: tombol tambah wadah (semua jenis dompet tampil tanpa
          filter). */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
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

      {/* Daftar wadah sebagai grid card (bukan table) — subkategori ada di
          halaman Kebutuhan. */}
      {visibleCategories.length === 0 ? (
        <Card variant="borderless" className="shadow-sm">
          <div className="flex items-center justify-center py-12">
            <Empty description={t("settings.categoriesEmpty")} />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCategories.map((category) => (
            <Card
              key={category.id}
              variant="borderless"
              className="shadow-sm"
              size="small"
              title={
                <span className="flex min-w-0 items-center gap-2">
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
                  <Text strong ellipsis className="max-w-40">
                    {category.name}
                  </Text>
                </span>
              }
              extra={
                category.walletType === "CASH" ? (
                  // Wadah Cash bawaan: hanya batas & warna yang bisa
                  // diubah (nama/jenis terkunci), tidak bisa dihapus.
                  <div className="flex items-center gap-1">
                    <Tooltip title={t("finance.walletCashBuiltIn")}>
                      <Tag style={{ margin: 0 }}>
                        {t("finance.walletCashBuiltInTag")}
                      </Tag>
                    </Tooltip>
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
                  </div>
                ) : (
                  <div className="flex gap-1">
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
                )
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                {renderWalletType(category.walletType)}
                {renderLimit(category)}
              </div>
            </Card>
          ))}
        </div>
      )}

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
            <Input maxLength={50} disabled={editingCat?.walletType === "CASH"} />
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

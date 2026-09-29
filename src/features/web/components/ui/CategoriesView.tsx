"use client";

import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
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
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { BudgetCategory } from "@/features/web/types";
import {
  createCategoryAction,
  createSubcategoryAction,
  deleteCategoryAction,
  deleteSubcategoryAction,
  getFinanceBundleAction,
  updateCategoryAction,
  updateSubcategoryAction,
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
}

interface SubFormValues {
  name: string;
  categoryId?: string;
}

interface CategoryRow {
  key: string;
  category: BudgetCategory;
}

/**
 * Halaman Kategori (dipindah dari Pengaturan): tabel wadah (CRUD penuh)
 * dan tabel subkategori — subkategori dikelompokkan per wadah lewat
 * expanded row (baris wadah tanpa aksi edit/hapus).
 */
export default function CategoriesView({ initialCategories }: Props) {
  const { t, locale } = useLocale();
  const { message } = App.useApp();

  const [categories, setCategories] = useState(initialCategories);
  const [reloadKey, setReloadKey] = useState(0);
  const [wadahFilter, setWadahFilter] = useState<string | null>(null);

  const [categoryForm] = Form.useForm<CategoryFormValues>();
  const [subForm] = Form.useForm<SubFormValues>();

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null);
  const [catSaving, setCatSaving] = useState(false);

  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<
    BudgetCategory["subcategories"][number] | null
  >(null);
  const [subSaving, setSubSaving] = useState(false);

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

  async function handleSubSubmit(values: SubFormValues) {
    setSubSaving(true);
    try {
      if (editingSub) {
        await updateSubcategoryAction(editingSub.id, values.name);
      } else if (values.categoryId) {
        await createSubcategoryAction(values.categoryId, values.name);
      }
      message.success(t("settings.saved"));
      setSubModalOpen(false);
      setEditingSub(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("settings.saveFailed"),
      );
    } finally {
      setSubSaving(false);
    }
  }

  async function handleDeleteSub(subId: string) {
    try {
      await deleteSubcategoryAction(subId);
      message.success(t("settings.saved"));
      setReloadKey((k) => k + 1);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("settings.saveFailed"),
      );
    }
  }

  /** Baris tabel wadah. */
  const categoryDataSource: CategoryRow[] = categories.map((c) => ({
    key: c.id,
    category: c,
  }));

  /**
   * Baris tabel subkategori: dikelompokkan per wadah (seperti desain awal,
   * via expanded row). Bisa difilter per wadah lewat Select.
   */
  const filteredCategories = wadahFilter
    ? categories.filter((c) => c.id === wadahFilter)
    : categories;

  const subDataSource: CategoryRow[] = filteredCategories.map((c) => ({
    key: c.id,
    category: c,
  }));

  const totalFilteredSubs = filteredCategories.reduce(
    (n, c) => n + c.subcategories.length,
    0,
  );

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
      title: t("settings.allocation"),
      key: "allocation",
      width: 160,
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
      render: (_: unknown, { category }: CategoryRow) => (
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

  /**
   * Kolom tabel subkategori: barisnya wadah (tanpa aksi edit/hapus —
   * CRUD wadah ada di tabel wadah). Subkategori muncul saat row di-expand.
   */
  const subColumns: ColumnsType<CategoryRow> = [
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
      title: t("categories.subTitle"),
      key: "count",
      width: 140,
      align: "right",
      render: (_: unknown, { category }: CategoryRow) => (
        <Text type="secondary">
          {t("categories.subCount", { n: category.subcategories.length })}
        </Text>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-350">
      {/* Tabel subkategori sengaja lebih lebar (3/5) dari tabel wadah (2/5) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Tabel wadah */}
        <div className="xl:col-span-2">
          <Card
            variant="borderless"
            className="shadow-sm h-full"
            title={<Text strong>{t("categories.wadahTitle")}</Text>}
            extra={
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
            }
            styles={{ body: { padding: 0 } }}
          >
            {categories.length === 0 ? (
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
        </div>

        {/* Tabel subkategori: dikelompokkan per wadah via expanded row,
            baris wadah tanpa aksi (CRUD wadah ada di tabel sebelah). */}
        <div className="xl:col-span-3">
          <Card
            variant="borderless"
            className="shadow-sm h-full"
            title={<Text strong>{t("categories.subTitle")}</Text>}
            extra={
              <Space size="small" wrap>
                <Select
                  value={wadahFilter ?? undefined}
                  onChange={(v) => setWadahFilter(v ?? null)}
                  placeholder={t("categories.filterWadahPlaceholder")}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  style={{ minWidth: 150 }}
                  aria-label={t("categories.filterWadah")}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  disabled={categories.length === 0}
                  onClick={() => {
                    setEditingSub(null);
                    subForm.resetFields();
                    // Pra-pilih wadah yang sedang difilter bila ada.
                    if (wadahFilter) {
                      subForm.setFieldValue("categoryId", wadahFilter);
                    }
                    setSubModalOpen(true);
                  }}
                >
                  {t("settings.addSubcategory")}
                </Button>
              </Space>
            }
            styles={{ body: { padding: 0 } }}
          >
            {categories.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Empty description={t("settings.categoriesEmpty")} />
              </div>
            ) : totalFilteredSubs === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Empty description={t("categories.subEmpty")} />
              </div>
            ) : (
              /* key mengikuti filter agar tabel remount dan semua baris
                 wadah ter-expand ulang (perilaku defaultExpandAllRows). */
              <Table
                key={wadahFilter ?? "all"}
                columns={subColumns}
                dataSource={subDataSource}
                size="small"
                pagination={false}
                expandable={{
                  defaultExpandAllRows: true,
                  expandRowByClick: true,
                  rowExpandable: ({ category }) =>
                    category.subcategories.length > 0,
                  expandedRowRender: ({ category }: CategoryRow) => (
                    <div className="space-y-1">
                      {category.subcategories.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            • {sub.name}
                          </Text>
                          <Space size={0}>
                            <Tooltip title={t("settings.editSubcategory")}>
                              <Button
                                type="text"
                                shape="circle"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => {
                                  setEditingSub(sub);
                                  subForm.setFieldsValue({ name: sub.name });
                                  setSubModalOpen(true);
                                }}
                                aria-label={t("settings.editSubcategory")}
                              />
                            </Tooltip>
                            <Popconfirm
                              title={t("settings.deleteSubConfirm")}
                              okText={t("common.delete")}
                              okButtonProps={{ danger: true }}
                              cancelText={t("common.cancel")}
                              onConfirm={() => void handleDeleteSub(sub.id)}
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
                          </Space>
                        </div>
                      ))}
                    </div>
                  ),
                }}
              />
            )}
          </Card>
        </div>
      </div>

      {/* Modal wadah */}
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
          initialValues={{ color: PRESET_COLORS[0], allocation: 0 }}
        >
          <Form.Item
            name="name"
            label={t("settings.categoryName")}
            rules={[{ required: true }]}
          >
            <Input maxLength={50} />
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

      {/* Modal subkategori */}
      <Modal
        open={subModalOpen}
        title={
          editingSub
            ? t("settings.editSubcategory")
            : t("settings.addSubcategory")
        }
        onCancel={() => setSubModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={{ xs: "92%", sm: 420 }}
      >
        <Form form={subForm} layout="vertical" onFinish={handleSubSubmit}>
          {!editingSub && (
            <Form.Item
              name="categoryId"
              label={t("categories.wadahTitle")}
              rules={[{ required: true }]}
            >
              <Select
                placeholder={t("form.subcategoryPlaceholder")}
                showSearch
                optionFilterProp="label"
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
            </Form.Item>
          )}
          <Form.Item
            name="name"
            label={t("settings.subcategoryName")}
            rules={[{ required: true }]}
          >
            <Input maxLength={50} />
          </Form.Item>
          <div className="mt-2 flex justify-end gap-2">
            <Button onClick={() => setSubModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="primary" htmlType="submit" loading={subSaving}>
              {t("settings.save")}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

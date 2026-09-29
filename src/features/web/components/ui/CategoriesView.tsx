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
  Table,
  Tag,
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

interface SubRow {
  key: string;
  sub: BudgetCategory["subcategories"][number];
  category: BudgetCategory;
}

/**
 * Halaman Kategori (dipindah dari Pengaturan): tabel wadah dan tabel
 * subkategori dipisah — masing-masing dengan CRUD sendiri.
 */
export default function CategoriesView({ initialCategories }: Props) {
  const { t, locale } = useLocale();
  const { message } = App.useApp();

  const [categories, setCategories] = useState(initialCategories);
  const [reloadKey, setReloadKey] = useState(0);

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

  /** Baris tabel subkategori (diflatten dari semua wadah). */
  const subDataSource: SubRow[] = categories.flatMap((c) =>
    c.subcategories.map((s) => ({ key: s.id, sub: s, category: c })),
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

  const subColumns: ColumnsType<SubRow> = [
    {
      title: t("settings.subcategoryName"),
      key: "name",
      render: (_: unknown, { sub }: SubRow) => <Text strong>{sub.name}</Text>,
    },
    {
      title: t("categories.wadahTitle"),
      key: "category",
      render: (_: unknown, { category }: SubRow) => (
        <Tag color={category.color} style={{ margin: 0 }}>
          {category.name}
        </Tag>
      ),
    },
    {
      title: t("table.colAction"),
      key: "action",
      width: 90,
      align: "center",
      render: (_: unknown, { sub }: SubRow) => (
        <div className="flex justify-center gap-1">
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
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-350">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Tabel wadah */}
        <Card
          variant="borderless"
          className="shadow-sm"
          title={<Text strong>{t("categories.wadahTitle")}</Text>}
          extra={
            <Button
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

        {/* Tabel subkategori */}
        <Card
          variant="borderless"
          className="shadow-sm"
          title={<Text strong>{t("categories.subTitle")}</Text>}
          extra={
            <Button
              icon={<PlusOutlined />}
              disabled={categories.length === 0}
              onClick={() => {
                setEditingSub(null);
                subForm.resetFields();
                setSubModalOpen(true);
              }}
            >
              {t("settings.addSubcategory")}
            </Button>
          }
          styles={{ body: { padding: 0 } }}
        >
          {subDataSource.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Empty
                description={
                  categories.length === 0
                    ? t("settings.categoriesEmpty")
                    : t("categories.subEmpty")
                }
              />
            </div>
          ) : (
            <Table
              columns={subColumns}
              dataSource={subDataSource}
              size="small"
              pagination={false}
            />
          )}
        </Card>
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

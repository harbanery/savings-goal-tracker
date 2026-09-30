"use client";

import {
  AppstoreOutlined,
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
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { BudgetCategory } from "@/features/web/types";
import {
  createSubcategoryAction,
  deleteSubcategoryAction,
  getUserCategoriesAction,
  updateSubcategoryAction,
} from "@/utils/server/actions";

const { Text } = Typography;

interface Props {
  initialCategories: BudgetCategory[];
}

interface SubFormValues {
  categoryId?: string;
  name?: string;
}

interface CategoryRow {
  key: string;
  category: BudgetCategory;
}

/** Baris subkategori (diflatten dari seluruh wadah). */
interface SubRow {
  key: string;
  subId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
}

/**
 * Halaman Kebutuhan: seluruh subkategori wadah dalam satu tabel —
 * CRUD subkategori (dipindahkan dari halaman Keuangan/Dompet).
 * Filter wadah opsional via Select.
 */
export default function NeedsView({ initialCategories }: Props) {
  const { t } = useLocale();
  const { message } = App.useApp();

  const [categories, setCategories] = useState(initialCategories);
  const [wadahFilter, setWadahFilter] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [subForm] = Form.useForm<SubFormValues>();
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubRow | null>(null);
  const [subSaving, setSubSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setCategories(await getUserCategoriesAction());
    } catch {
      // biarkan state lama
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (reloadKey > 0) void refresh();
  }, [reloadKey, refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /** Wadah dengan subkategori (grup tampilan tabel). */
  const groupedCategories = useMemo(
    () =>
      wadahFilter
        ? categories.filter((c) => c.id === wadahFilter)
        : categories,
    [categories, wadahFilter],
  );

  const dataSource: CategoryRow[] = groupedCategories.map((c) => ({
    key: c.id,
    category: c,
  }));

  const totalSubs = groupedCategories.reduce(
    (n, c) => n + c.subcategories.length,
    0,
  );

  async function handleSubSubmit(values: SubFormValues) {
    setSubSaving(true);
    try {
      if (editingSub) {
        await updateSubcategoryAction(editingSub.subId, values.name ?? "");
      } else if (values.categoryId) {
        await createSubcategoryAction(values.categoryId, values.name ?? "");
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

  async function handleDeleteSub(sub: SubRow) {
    try {
      await deleteSubcategoryAction(sub.subId);
      message.success(t("settings.saved"));
      setReloadKey((k) => k + 1);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("settings.saveFailed"),
      );
    }
  }

  const columns: ColumnsType<CategoryRow> = [
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
      title: t("needs.subcategories"),
      key: "subs",
      render: (_: unknown, { category }: CategoryRow) => {
        if (category.subcategories.length === 0) {
          return <Text type="secondary">{t("needs.subEmptyInline")}</Text>;
        }
        return (
          <Space size={[4, 4]} wrap>
            {category.subcategories.map((sub) => (
              <Tag
                key={sub.id}
                style={{ margin: 0 }}
                closable
                closeIcon={
                  <Popconfirm
                    title={t("settings.deleteSubConfirm")}
                    okText={t("common.delete")}
                    okButtonProps={{ danger: true }}
                    cancelText={t("common.cancel")}
                    onConfirm={() =>
                      void handleDeleteSub({
                        key: sub.id,
                        subId: sub.id,
                        name: sub.name,
                        categoryId: category.id,
                        categoryName: category.name,
                        categoryColor: category.color,
                      })
                    }
                  >
                    <DeleteOutlined />
                  </Popconfirm>
                }
              >
                <button
                  type="button"
                  className="flex cursor-pointer items-center gap-1 bg-transparent"
                  onClick={() => {
                    setEditingSub({
                      key: sub.id,
                      subId: sub.id,
                      name: sub.name,
                      categoryId: category.id,
                      categoryName: category.name,
                      categoryColor: category.color,
                    });
                    subForm.setFieldsValue({
                      categoryId: category.id,
                      name: sub.name,
                    });
                    setSubModalOpen(true);
                  }}
                  aria-label={`${t("settings.editSubcategory")}: ${sub.name}`}
                >
                  <EditOutlined style={{ fontSize: 10 }} />
                  {sub.name}
                </button>
              </Tag>
            ))}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="w-full">
      {/* Toolbar di luar table: filter wadah + tombol tambah subkategori */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Select
          value={wadahFilter ?? undefined}
          onChange={(v) => setWadahFilter(v ?? null)}
          placeholder={t("categories.filterWadahPlaceholder")}
          allowClear
          showSearch
          optionFilterProp="label"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          style={{ minWidth: 180 }}
          aria-label={t("categories.filterWadah")}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={categories.length === 0}
          onClick={() => {
            setEditingSub(null);
            subForm.resetFields();
            if (wadahFilter) {
              subForm.setFieldValue("categoryId", wadahFilter);
            }
            setSubModalOpen(true);
          }}
        >
          {t("settings.addSubcategory")}
        </Button>
      </div>

      <Card
        variant="borderless"
        className="shadow-sm"
        title={
          <span className="flex items-center gap-2">
            <AppstoreOutlined />
            <Text strong>{t("needs.title")}</Text>
          </span>
        }
        extra={
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("needs.subCount", { n: totalSubs })}
          </Text>
        }
        styles={{ body: { padding: 0 } }}
      >
        {categories.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Empty description={t("settings.categoriesEmpty")} />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={dataSource}
            size="small"
            pagination={false}
          />
        )}
      </Card>

      {/* Modal tambah/edit subkategori */}
      <Modal
        open={subModalOpen}
        title={
          editingSub
            ? t("settings.editSubcategory")
            : t("settings.addSubcategory")
        }
        onCancel={() => {
          setSubModalOpen(false);
          setEditingSub(null);
        }}
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
            <Button
              onClick={() => {
                setSubModalOpen(false);
                setEditingSub(null);
              }}
              icon={<CloseOutlined />}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={subSaving}
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

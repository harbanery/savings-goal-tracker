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
  Col,
  ColorPicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type {
  BudgetCategory,
  UserSettings,
} from "@/features/web/types";
import {
  createCategoryAction,
  createSubcategoryAction,
  deleteCategoryAction,
  deleteSubcategoryAction,
  getFinanceBundleAction,
  updateCategoryAction,
  updateSettingsAction,
  updateSubcategoryAction,
} from "@/utils/server/actions";

const { Text, Title } = Typography;

interface Props {
  initialSettings: UserSettings;
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
}

/** Halaman pengaturan: siklus, saldo awal, dan kelola wadah/subkategori. */
export default function SettingsSection({
  initialSettings,
  initialCategories,
}: Props) {
  const { t } = useLocale();
  const { message } = App.useApp();

  const [settings, setSettings] = useState(initialSettings);
  const [categories, setCategories] = useState(initialCategories);
  const [savingSettings, setSavingSettings] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [settingsForm] = Form.useForm<{
    cycleStartDay: number;
    savingsInitial: number;
  }>();
  const [categoryForm] = Form.useForm<CategoryFormValues>();
  const [subForm] = Form.useForm<SubFormValues>();

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null);
  const [catSaving, setCatSaving] = useState(false);

  const [subModal, setSubModal] = useState<{
    open: boolean;
    categoryId: string;
    sub: BudgetCategory["subcategories"][number] | null;
  }>({ open: false, categoryId: "", sub: null });
  const [subSaving, setSubSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const bundle = await getFinanceBundleAction();
      setCategories(bundle.categories);
      setSettings(bundle.settings);
    } catch {
      // biarkan state lama
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (reloadKey > 0) void refresh();
  }, [reloadKey, refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSaveSettings(values: {
    cycleStartDay: number;
    savingsInitial: number;
  }) {
    setSavingSettings(true);
    try {
      const next = await updateSettingsAction({
        cycleStartDay: values.cycleStartDay,
        savingsInitial: values.savingsInitial,
      });
      setSettings(next);
      message.success(t("settings.saved"));
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("settings.saveFailed"),
      );
    } finally {
      setSavingSettings(false);
    }
  }

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
      if (subModal.sub) {
        await updateSubcategoryAction(subModal.sub.id, values.name);
      } else {
        await createSubcategoryAction(subModal.categoryId, values.name);
      }
      message.success(t("settings.saved"));
      setSubModal({ open: false, categoryId: "", sub: null });
      setReloadKey((k) => k + 1);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("settings.saveFailed"),
      );
    } finally {
      setSubSaving(false);
    }
  }

  async function handleDeleteSub(
    categoryId: string,
    sub: BudgetCategory["subcategories"][number],
  ) {
    try {
      await deleteSubcategoryAction(sub.id);
      message.success(t("settings.saved"));
      setReloadKey((k) => k + 1);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("settings.saveFailed"),
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Title level={4}>{t("settings.title")}</Title>

      {/* Pengaturan siklus & saldo */}
      <Card
        variant="borderless"
        className="shadow-sm"
        style={{ marginBottom: 16 }}
        title={<Text strong>{t("settings.financeTitle")}</Text>}
      >
        <Form
          form={settingsForm}
          layout="vertical"
          onFinish={handleSaveSettings}
          initialValues={{
            cycleStartDay: settings.cycleStartDay,
            savingsInitial: settings.savingsInitial,
          }}
          className="max-w-md"
        >
          <Form.Item
            name="cycleStartDay"
            label={t("settings.cycleStartDay")}
            extra={t("settings.cycleStartDayHint")}
            rules={[{ required: true }]}
          >
            <Select
              options={Array.from({ length: 28 }, (_, i) => ({
                value: i + 1,
                label: String(i + 1),
              }))}
            />
          </Form.Item>
          <Form.Item
            name="savingsInitial"
            label={t("settings.savingsInitial")}
            rules={[{ required: true }]}
          >
            <InputNumber<number>
              style={{ width: "100%" }}
              addonBefore="Rp"
              min={0}
              step={100000}
              formatter={(v) =>
                v === undefined || v === null
                  ? ""
                  : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
              }
              parser={(v) => Number((v ?? "").replace(/\D/g, "") || 0)}
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            shape="round"
            loading={savingSettings}
            icon={<CheckOutlined />}
          >
            {t("settings.save")}
          </Button>
        </Form>
      </Card>

      {/* Kelola wadah/kategori */}
      <Card
        variant="borderless"
        className="shadow-sm"
        title={<Text strong>{t("settings.categoriesTitle")}</Text>}
        extra={
          <Button
            size="small"
            shape="round"
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
      >
        {categories.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Empty description={t("settings.categoriesEmpty")} />
          </div>
        ) : (
          <Row gutter={[12, 12]}>
            {categories.map((cat) => (
              <Col key={cat.id} xs={24} md={12}>
                <div className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-700/60">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          display: "inline-block",
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: cat.color,
                        }}
                      />
                      <Text strong>{cat.name}</Text>
                    </div>
                    <Space size={0}>
                      <Button
                        type="text"
                        shape="circle"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setEditingCat(cat);
                          categoryForm.setFieldsValue({
                            name: cat.name,
                            color: cat.color,
                            allocation: cat.allocation,
                          });
                          setCatModalOpen(true);
                        }}
                      />
                      <Popconfirm
                        title={t("settings.deleteCategoryConfirm")}
                        okText={t("common.delete")}
                        okButtonProps={{ danger: true }}
                        cancelText={t("common.cancel")}
                        onConfirm={() => void handleDeleteCategory(cat)}
                      >
                        <Button
                          type="text"
                          shape="circle"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    </Space>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t("settings.allocation")}: Rp{" "}
                    {cat.allocation.toLocaleString("id-ID")}
                  </Text>

                  <div className="mt-2 space-y-1">
                    {cat.subcategories.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          • {sub.name}
                        </Text>
                        <Space size={0}>
                          <Button
                            type="text"
                            shape="circle"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => {
                              setSubModal({
                                open: true,
                                categoryId: cat.id,
                                sub,
                              });
                              subForm.setFieldsValue({ name: sub.name });
                            }}
                          />
                          <Popconfirm
                            title={t("settings.deleteSubConfirm")}
                            okText={t("common.delete")}
                            okButtonProps={{ danger: true }}
                            cancelText={t("common.cancel")}
                            onConfirm={() =>
                              void handleDeleteSub(cat.id, sub)
                            }
                          >
                            <Button
                              type="text"
                              shape="circle"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                            />
                          </Popconfirm>
                        </Space>
                      </div>
                    ))}
                    <Button
                      type="dashed"
                      size="small"
                      block
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setSubModal({
                          open: true,
                          categoryId: cat.id,
                          sub: null,
                        });
                        subForm.resetFields();
                      }}
                    >
                      {t("settings.addSubcategory")}
                    </Button>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* Modal kategori */}
      <Modal
        open={catModalOpen}
        title={
          editingCat
            ? t("settings.editCategory")
            : t("settings.addCategory")
        }
        onCancel={() => {
          setCatModalOpen(false);
          setEditingCat(null);
        }}
        footer={null}
        destroyOnHidden
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
        open={subModal.open}
        title={
          subModal.sub
            ? t("settings.editSubcategory")
            : t("settings.addSubcategory")
        }
        onCancel={() => setSubModal({ open: false, categoryId: "", sub: null })}
        footer={null}
        destroyOnHidden
        width={{ xs: "92%", sm: 420 }}
      >
        <Form form={subForm} layout="vertical" onFinish={handleSubSubmit}>
          <Form.Item
            name="name"
            label={t("settings.subcategoryName")}
            rules={[{ required: true }]}
          >
            <Input maxLength={50} />
          </Form.Item>
          <div className="mt-2 flex justify-end gap-2">
            <Button
              onClick={() =>
                setSubModal({ open: false, categoryId: "", sub: null })
              }
            >
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

"use client";

import {
  AppstoreOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Collapse,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tooltip,
  Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type {
  BudgetCategory,
  Transaction,
} from "@/features/web/types";
import {
  createSubcategoryAction,
  deleteSubcategoryAction,
  getCycleTransactionsAction,
  getUserCategoriesAction,
  updateSubcategoryAction,
} from "@/utils/server/actions";
import { useCycle } from "@/features/web/hooks/cycle";
import type { CycleInfo } from "@/features/web/utils/cycle";
import {
  computeCycleStats,
  type SubcategoryStat,
} from "@/features/web/utils/stats";
import { formatIDR } from "@/utils/helpers";

const { Text } = Typography;

interface Props {
  initialCategories: BudgetCategory[];
  /** Transaksi siklus aktif — statistik pemakaian per subkategori (D4). */
  initialTransactions: Transaction[];
}

interface SubFormValues {
  categoryId?: string;
  name?: string;
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
 * Halaman Kebutuhan: subkategori wadah dikelompokkan per wadah dalam
 * Collapse (bukan table) — CRUD subkategori (dipindahkan dari halaman
 * Keuangan/Dompet). Semua wadah tampil sekaligus (tanpa filter).
 *
 * Rekomendasi D4 (rekomendasi_feature.md):
 * - Edit subkategori kini bisa MEMINDAHKAN wadah (param `categoryId` di
 *   `updateSubcategoryAction` — transaksi lama tetap di wadah aslinya).
 * - Statistik pemakaian inline per subkategori (Nx · Y% + nominal,
 *   seperti ringkas di /finance) — siklus mengikuti DatePicker navbar.
 * - Pencarian subkategori lintas wadah (muncul saat > 6 subkategori);
 *   saat mencari, wadah yang cocok dipaksa terbuka.
 */
export default function NeedsView({
  initialCategories,
  initialTransactions,
}: Props) {
  const { t, locale } = useLocale();
  const { message } = App.useApp();

  const [categories, setCategories] = useState(initialCategories);
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [reloadKey, setReloadKey] = useState(0);
  /** D4: pencarian subkategori lintas wadah. */
  const [subQuery, setSubQuery] = useState("");
  /** Panel Collapse yang terbuka (dikendalikan agar bisa dipaksa saat cari). */
  const [activeKeys, setActiveKeys] = useState<string[]>(() =>
    initialCategories
      .filter((c) => c.subcategories.length > 0)
      .map((c) => c.id),
  );

  /** Siklus aktif global (dipilih lewat DatePicker month di navbar). */
  const { cycle } = useCycle();

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

  const refreshCycle = useCallback(async (targetCycle: CycleInfo) => {
    try {
      setTransactions(await getCycleTransactionsAction(targetCycle));
    } catch (err) {
      console.error("[NeedsView] gagal memuat data siklus:", err);
      setTransactions([]);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (reloadKey > 0) void refresh();
  }, [reloadKey, refresh]);

  useEffect(() => {
    refreshCycle(cycle).catch(() => {});
  }, [cycle, refreshCycle]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * D4: statistik pemakaian per subkategori pada siklus aktif —
   * pemakaian (jumlah transaksi, % share, nominal terpakai) dihitung
   * via computeCycleStats yang sama dengan halaman Keuangan.
   */
  const statBySub = useMemo(() => {
    const stats = computeCycleStats(transactions, categories, 0);
    const map = new Map<string, SubcategoryStat>();
    for (const c of stats.categories) {
      for (const s of c.subcategories) map.set(s.subcategoryId, s);
    }
    return map;
  }, [transactions, categories]);

  const totalSubs = categories.reduce(
    (n, c) => n + c.subcategories.length,
    0,
  );

  /**
   * D4: subkategori yang tampil — semua secara default; pencarian nama
   * lintas wadah (relevan saat jumlah subkategori > 6). Saat mencari,
   * hanya wadah yang punya kecocokan yang ditampilkan & dipaksa terbuka.
   */
  const query = subQuery.trim().toLowerCase();
  const searching = query !== "";
  const visibleGroups = useMemo(() => {
    if (!searching) return categories;
    return categories
      .map((c) => ({
        ...c,
        subcategories: c.subcategories.filter((s) =>
          s.name.toLowerCase().includes(query),
        ),
      }))
      .filter((c) => c.subcategories.length > 0);
  }, [categories, searching, query]);

  async function handleSubSubmit(values: SubFormValues) {
    setSubSaving(true);
    try {
      if (editingSub) {
        // D4: categoryId terisi = pindah wadah (sama = tidak berpindah).
        await updateSubcategoryAction(
          editingSub.subId,
          values.name ?? "",
          values.categoryId,
        );
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

  /** Statistik pemakaian inline (D4): Nx · Y% + nominal, format /finance. */
  function renderSubStat(subId: string) {
    const stat = statBySub.get(subId);
    if (!stat || stat.transactionCount === 0) return null;
    return (
      <span className="flex shrink-0 items-center gap-2">
        <Text type="secondary" style={{ fontSize: 12 }}>
          {stat.transactionCount}x · {stat.share}%
        </Text>
        <Text style={{ fontSize: 12 }}>
          {formatIDR(stat.spent, locale)}
        </Text>
      </span>
    );
  }

  return (
    <div className="w-full">
      {/* Toolbar di luar daftar: pencarian lintas wadah (D4, hanya relevan
          saat > 6 subkategori) + tombol tambah subkategori. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        {totalSubs > 6 ? (
          <div className="w-full max-w-[200px] sm:w-auto sm:max-w-[220px]">
            <Input
              allowClear
              prefix={<SearchOutlined className="text-zinc-400!" />}
              placeholder={t("needs.searchPlaceholder")}
              value={subQuery}
              onChange={(e) => setSubQuery(e.target.value)}
              aria-label={t("needs.searchPlaceholder")}
            />
          </div>
        ) : (
          <span />
        )}
        <Button
          type="primary"
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
      </div>

      <Card
        variant="borderless"
        className="shadow-sm!"
        title={
          <span className="flex items-center gap-2">
            <AppstoreOutlined />
            <Text strong>{t("needs.title")}</Text>
          </span>
        }
        extra={
          <Text type="secondary" style={{ fontSize: 12 }}>
            {searching
              ? t("table.filterResult", {
                  shown: visibleGroups.reduce(
                    (n, c) => n + c.subcategories.length,
                    0,
                  ),
                  total: totalSubs,
                })
              : t("needs.subCount", { n: totalSubs })}
          </Text>
        }
        styles={{ body: { padding: 16 } }}
      >
        {categories.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Empty description={t("settings.categoriesEmpty")} />
          </div>
        ) : searching && visibleGroups.length === 0 ? (
          // D4: pencarian subkategori tanpa hasil.
          <div className="flex items-center justify-center py-12">
            <Empty description={t("needs.searchEmpty")} />
          </div>
        ) : (
          <Collapse
            // Saat mencari, panel dengan kecocokan dipaksa terbuka;
            // normalnya mengikuti pilihan user.
            activeKey={
              searching ? visibleGroups.map((c) => c.id) : activeKeys
            }
            onChange={(keys) =>
              setActiveKeys(Array.isArray(keys) ? keys : [keys])
            }
            items={visibleGroups.map((category) => ({
              key: category.id,
              label: (
                <span className="flex items-center gap-2">
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
                  {category.subcategories.length > 0 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t("needs.subCount", {
                        n: category.subcategories.length,
                      })}
                    </Text>
                  )}
                </span>
              ),
              showArrow: false,
              children:
                category.subcategories.length === 0 ? (
                  <Text type="secondary">{t("needs.subEmptyInline")}</Text>
                ) : (
                  <div className="flex flex-col gap-2">
                    {category.subcategories.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-black/[0.02] px-3 py-2 dark:bg-white/[0.04]"
                      >
                        <Text className="min-w-0! truncate!">{sub.name}</Text>
                        <div className="flex items-center gap-2">
                          {renderSubStat(sub.id)}
                          <Space size={0}>
                            <Tooltip title={t("settings.editSubcategory")}>
                              <Button
                                type="text"
                                shape="circle"
                                size="small"
                                icon={<EditOutlined />}
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
                              />
                            </Tooltip>
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
                              <Button
                                type="text"
                                shape="circle"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                aria-label={`${t("common.delete")}: ${sub.name}`}
                              />
                            </Popconfirm>
                          </Space>
                        </div>
                      </div>
                    ))}
                  </div>
                ),
            }))}
          />
        )}
      </Card>

      {/* Modal tambah/edit subkategori — saat edit, wadah bisa diganti
          untuk MEMINDAHKAN subkategori (rekomendasi D4). */}
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
          {editingSub && (
            <Text
              type="secondary"
              style={{ fontSize: 12 }}
              className="-mt-2! mb-1! block!"
            >
              {t("needs.moveHint")}
            </Text>
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

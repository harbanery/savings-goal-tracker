"use client";

import {
  BankOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  SwapOutlined,
  UnorderedListOutlined,
  UpOutlined,
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
  Modal,
  Popconfirm,
  Progress,
  Select,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type {
  BudgetCategory,
  Transaction,
  WalletType,
} from "@/features/web/types";
import TransactionFormModal from "@/features/transactions/components/ui/TransactionFormModal";
import {
  createCategoryAction,
  deleteCategoryAction,
  getBudgetOverviewAction,
  getCycleTransactionsAction,
  getFinanceBundleAction,
  reorderCategoriesAction,
  updateCategoryAction,
} from "@/utils/server/actions";
import { useCycle } from "@/features/web/hooks/cycle";
import type { CycleInfo } from "@/features/web/utils/cycle";
import { computeCycleStats } from "@/features/web/utils/stats";
import { formatIDR } from "@/utils/helpers";

const { Text } = Typography;

interface Props {
  initialCategories: BudgetCategory[];
  initialTransactions: Transaction[];
  /** Budget yang bisa dialokasikan siklus awal. */
  initialAllocatable: number;
  /** Tabungan dilindungi siklus awal (dikurangkan dari total alokasi). */
  initialProtected: number;
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
 * hanya warnanya yang bisa diubah, tidak bisa dihapus.
 * Alokasi TIDAK bisa diedit per wadah (insight DROID.md) — dana wadah
 * murni lewat pemasukan/transfer; tiap card menampilkan progress dana
 * wadah (pemasukan + transfer masuk − pengeluaran − transfer keluar).
 * Progress bar toolbar menampilkan BIAYA ALOKASI tiap wadah (pemasukan +
 * transfer masuk − transfer keluar) terhadap budget yang bisa
 * dialokasikan — transfer hanya memindahkan dana antar wadah sehingga
 * total alokasi tidak berubah (bug DROID.md); label Total Alokasi
 * ditampilkan dikurangi tabungan dilindungi (DROID.md).
 * Subkategori wadah ada di halaman Kebutuhan; Budget & Target halaman sendiri.
 */
export default function WalletsView({
  initialCategories,
  initialTransactions,
  initialAllocatable,
  initialProtected,
}: Props) {
  const { t, locale } = useLocale();
  const { message } = App.useApp();
  const router = useRouter();
  const creatableTypes = useCreatableWalletTypeOptions();

  const [categories, setCategories] = useState(initialCategories);
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  /** Budget yang bisa dialokasikan = saldo awal + pemasukan − tabungan dilindungi. */
  const [allocatable, setAllocatable] = useState(initialAllocatable);
  /** Tabungan dilindungi — total alokasi tampil dikurangi nilai ini. */
  const [protectedSavings, setProtectedSavings] = useState(initialProtected);
  const [reloadKey, setReloadKey] = useState(0);
  /** D3: aksi cepat transfer dari sebuah wadah (modal TRANSFER, fromUnit terisi). */
  const [transferFrom, setTransferFrom] = useState<BudgetCategory | null>(null);
  /** D3: pencarian wadah (ditampilkan saat jumlah wadah > 6). */
  const [walletQuery, setWalletQuery] = useState("");

  /** Siklus aktif global (dipilih lewat DatePicker month di navbar). */
  const { cycle } = useCycle();

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

  const refreshCycle = useCallback(async (targetCycle: CycleInfo) => {
    try {
      const [fresh, overview] = await Promise.all([
        getCycleTransactionsAction(targetCycle),
        getBudgetOverviewAction(targetCycle),
      ]);
      setTransactions(fresh);
      setAllocatable(overview.allocatable);
      setProtectedSavings(overview.protectedSavings);
    } catch (err) {
      console.error("[WalletsView] gagal memuat data siklus:", err);
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

  /** Stat per wadah siklus aktif (dana masuk/keluar tiap wadah). */
  const statByCat = useMemo(() => {
    const stats = computeCycleStats(transactions, categories, 0);
    return new Map(stats.categories.map((c) => [c.categoryId, c]));
  }, [transactions, categories]);

  /** antd ColorPicker menyimpan objek Color di form — server action butuh
   *  string hex biasa (objek class tidak bisa diserialisasi ke server). */
  function toHexColor(color: CategoryFormValues["color"]): string {
    if (typeof color === "string") return color;
    return color?.toHexString?.() ?? "#6366f1";
  }

  async function handleCategorySubmit(values: CategoryFormValues) {
    setCatSaving(true);
    try {
      // Wadah Cash bawaan: nama & jenis terkunci — kirim hanya warna.
      // (Alokasi tidak bisa diedit — dana wadah lewat pemasukan/transfer.)
      const isCash = editingCat?.walletType === "CASH";
      const payload = {
        name: isCash ? undefined : values.name,
        color: toHexColor(values.color),
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

  /**
   * D3: transaksi terakhir per wadah (badge kartu) — tanggal mutasi
   * terbaru yang menyentuh wadah (sebagai sumber/tujuan) di siklus aktif.
   */
  const lastDateByCat = useMemo(() => {
    const map = new Map<string, string>();
    for (const tr of transactions) {
      const ids = tr.toCategoryId
        ? [tr.categoryId, tr.toCategoryId]
        : [tr.categoryId];
      for (const id of ids) {
        const prev = map.get(id);
        if (!prev || tr.date > prev) map.set(id, tr.date);
      }
    }
    return map;
  }, [transactions]);

  /**
   * D3: tombol naik/turun — tukar posisi dengan tetangga (optimistis),
   * lalu persist urutan via `reorderCategoriesAction` (kolom `order`
   * sudah ada di schema).
   */
  async function handleMoveCategory(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    const prev = categories;
    setCategories(next);
    try {
      await reorderCategoriesAction(next.map((c) => c.id));
    } catch (err) {
      console.error("[WalletsView] gagal menyimpan urutan wadah:", err);
      setCategories(prev);
      message.error(t("settings.saveFailed"));
    }
  }

  /**
   * Wadah yang tampil: semua secara default; D3 menambah pencarian
   * nama (relevan saat jumlah wadah > 6).
   */
  const visibleCategories = useMemo(() => {
    const q = walletQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, walletQuery]);

  /**
   * Segmen alokasi dana tiap wadah untuk progress bar budget yang bisa
   * dialokasikan di toolbar: alokasi = pemasukan + transfer masuk −
   * transfer keluar — transfer hanya memindahkan dana antar wadah, jadi
   * total alokasi TIDAK bertambah saat transfer (bug DROID.md).
   * Total alokasi yang DITAMPILKAN dikurangi tabungan dilindungi
   * (permintaan DROID.md) sehingga sebanding dengan budget yang bisa
   * dialokasikan.
   */
  const allocatedSegments = useMemo(() => {
    const segs = categories
      .map((c) => {
        const stat = statByCat.get(c.id);
        const allocated =
          (stat?.income ?? 0) +
          (stat?.transferIn ?? 0) -
          (stat?.transferOut ?? 0);
        return { id: c.id, name: c.name, color: c.color, allocated };
      })
      .filter((s) => s.allocated > 0)
      .sort((a, b) => b.allocated - a.allocated);
    const totalAllocated = segs.reduce((n, s) => n + s.allocated, 0);
    // Skala agar total segmen mentok di 100% bila alokasi melampaui budget.
    const scale =
      totalAllocated > 0 && allocatable > 0
        ? Math.min(1, allocatable / totalAllocated)
        : 0;
    return {
      segments: segs.map((s) => ({
        ...s,
        widthPct:
          allocatable > 0 ? (s.allocated * scale * 100) / allocatable : 0,
      })),
      totalAllocated,
      /** Total alokasi tampil = total mutasi − tabungan dilindungi. */
      totalAllocatedNet: Math.max(0, totalAllocated - protectedSavings),
    };
  }, [categories, statByCat, allocatable, protectedSavings]);

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

  /**
   * Progress dana wadah + keterangan sisa: dana = pemasukan + transfer
   * masuk (alokasi tidak bisa diedit — insight DROID.md); terpakai =
   * pengeluaran + transfer keluar; sisa = dana − terpakai.
   */
  function renderWalletProgress(category: BudgetCategory) {
    const stat = statByCat.get(category.id);
    const income = stat?.income ?? 0;
    const transferIn = stat?.transferIn ?? 0;
    const used = (stat?.spent ?? 0) + (stat?.transferOut ?? 0);
    const budget = income + transferIn;
    const remaining = budget - used;
    const overBudget = remaining < 0;
    const percent =
      budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : 0;

    // Wadah tanpa dana sama sekali: belum bisa pengeluaran/transfer.
    if (budget <= 0) {
      return (
        <Text type="secondary" style={{ fontSize: 12 }} className="mt-2! block!">
          {t("finance.notAllocatedHint")}
        </Text>
      );
    }

    const subs = (stat?.subcategories ?? [])
      .filter((s) => s.transactionCount > 0)
      .sort((a, b) => b.spent - a.spent);

    return (
      <div className="mt-2">
        <Progress
          percent={percent}
          size="small"
          showInfo={false}
          aria-label={category.name}
          strokeColor={overBudget ? "#ef4444" : category.color}
        />
        <div className="flex items-center justify-between">
          <Text style={{ fontSize: 12 }}>
            {t("finance.walletUsed")}: {formatIDR(used, locale)}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            / {t("finance.walletFunds")} {formatIDR(budget, locale)}
          </Text>
        </div>
        <Text
          style={{
            fontSize: 12,
            color: overBudget ? "#ef4444" : category.color,
            fontWeight: 600,
          }}
        >
          {overBudget
            ? t("finance.walletOver")
            : t("finance.walletRemainingLabel")}
          {formatIDR(Math.abs(remaining), locale)}
        </Text>

        {/* Mutasi non-pengeluaran (income/transfer masuk) bila ada. */}
        {(income > 0 || transferIn > 0) && (
          <div className="mt-1 flex flex-wrap gap-x-2">
            {income > 0 && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                +{formatIDR(income, locale)}
              </Text>
            )}
            {transferIn > 0 && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                ⇄+{formatIDR(transferIn, locale)}
              </Text>
            )}
          </div>
        )}

        {/* Rincian per subkategori (wadah tanpa subkategori menampilkan
            total wadah saja). */}
        {subs.length > 0 && (
          <div className="mt-1.5 space-y-0.5 border-t border-zinc-100 pt-1.5 dark:border-zinc-700/60">
            {subs.map((s) => (
              <div
                key={s.subcategoryId}
                className="flex items-center justify-between gap-2"
              >
                <Text
                  type="secondary"
                  style={{ fontSize: 11 }}
                  className="truncate!"
                >
                  {s.name}
                  <span className="ml-1 opacity-70">
                    ({s.transactionCount}x · {s.share}%)
                  </span>
                </Text>
                <Text style={{ fontSize: 11, flexShrink: 0 }}>
                  {formatIDR(s.spent, locale)}
                </Text>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Toolbar: progress bar alokasi dana tiap wadah (bukan yang
          terpakai) terhadap budget yang bisa dialokasikan + tombol
          tambah wadah. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-col gap-1 w-full max-w-xs sm:max-w-sm"
          aria-label={t("finance.budgetAllocatable")}
        >
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            {allocatedSegments.segments.map((s) => (
              <Tooltip
                key={s.id}
                title={`${s.name}: ${formatIDR(s.allocated, locale)}`}
              >
                <div
                  className="h-full min-w-0"
                  style={{ width: `${s.widthPct}%`, background: s.color }}
                />
              </Tooltip>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Text style={{ fontSize: 11 }}>
              {t("finance.allocationTotal")}:{" "}
              {formatIDR(allocatedSegments.totalAllocatedNet, locale)}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {t("finance.budgetAllocatable")}: {formatIDR(allocatable, locale)}
            </Text>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* D3: pencarian wadah — hanya relevan saat jumlah wadah > 6. */}
          {categories.length > 6 && (
            <div className="w-full max-w-[200px] sm:w-auto sm:max-w-[220px]">
              <Input
                allowClear
                prefix={<SearchOutlined className="text-zinc-400!" />}
                placeholder={t("finance.searchPlaceholder")}
                value={walletQuery}
                onChange={(e) => setWalletQuery(e.target.value)}
                aria-label={t("finance.searchPlaceholder")}
              />
            </div>
          )}
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
      </div>

      {/* Daftar wadah sebagai grid card (bukan table) — subkategori ada di
          halaman Kebutuhan. */}
      {categories.length === 0 ? (
        <Card variant="borderless" className="shadow-sm!">
          <div className="flex items-center justify-center py-12">
            <Empty description={t("settings.categoriesEmpty")} />
          </div>
        </Card>
      ) : visibleCategories.length === 0 ? (
        // D3: pencarian wadah tanpa hasil.
        <Card variant="borderless" className="shadow-sm!">
          <div className="flex items-center justify-center py-12">
            <Empty description={t("finance.searchEmpty")} />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCategories.map((category) => {
            // Indeks pada daftar penuh (bukan hasil pencarian) untuk
            // status disabled tombol naik/turun.
            const fullIndex = categories.indexOf(category);
            const txCount = statByCat.get(category.id)?.transactionCount ?? 0;
            const lastDate = lastDateByCat.get(category.id);
            return (
              <Card
                key={category.id}
                variant="borderless"
                className="shadow-sm!"
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
                    <Text strong ellipsis className="max-w-40!">
                      {category.name}
                    </Text>
                  </span>
                }
                extra={
                  category.walletType === "CASH" ? (
                    // Wadah Cash bawaan: hanya warnanya yang bisa diubah
                    // (nama/jenis terkunci), tidak bisa dihapus.
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
                          walletType: category.walletType,
                        });
                        setCatModalOpen(true);
                      }}
                      aria-label={t("settings.editCategory")}
                    />
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
                </div>
                {renderWalletProgress(category)}

                {/* D3: badge jumlah transaksi + terakhir dicatat (siklus
                    aktif) & aksi cepat — lihat mutasi (deep-link ke
                    /transactions?unit=), transfer dari wadah ini, dan
                    urutan naik/turun. */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-700/60">
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {txCount > 0 && lastDate
                      ? `${t("finance.walletTxCount", { n: txCount })} · ${t("finance.walletLastRecord", {
                          date: dayjs(lastDate).format("DD MMM YYYY"),
                        })}`
                      : t("finance.walletNoTx")}
                  </Text>
                  <div className="flex items-center gap-0.5">
                    <Tooltip title={t("finance.moveUpAria", { name: category.name })}>
                      <Button
                        type="text"
                        shape="circle"
                        size="small"
                        icon={<UpOutlined />}
                        disabled={fullIndex <= 0}
                        onClick={() => void handleMoveCategory(fullIndex, -1)}
                        aria-label={t("finance.moveUpAria", { name: category.name })}
                      />
                    </Tooltip>
                    <Tooltip title={t("finance.moveDownAria", { name: category.name })}>
                      <Button
                        type="text"
                        shape="circle"
                        size="small"
                        icon={<DownOutlined />}
                        disabled={fullIndex >= categories.length - 1}
                        onClick={() => void handleMoveCategory(fullIndex, 1)}
                        aria-label={t("finance.moveDownAria", { name: category.name })}
                      />
                    </Tooltip>
                    <Tooltip title={t("finance.transferFrom")}>
                      <Button
                        type="text"
                        shape="circle"
                        size="small"
                        icon={<SwapOutlined />}
                        onClick={() => setTransferFrom(category)}
                        aria-label={t("finance.transferFrom")}
                      />
                    </Tooltip>
                    <Tooltip title={t("finance.viewMutations")}>
                      <Button
                        type="text"
                        shape="circle"
                        size="small"
                        icon={<UnorderedListOutlined />}
                        onClick={() =>
                          router.push(`/transactions?unit=${category.id}`)
                        }
                        aria-label={t("finance.viewMutations")}
                      />
                    </Tooltip>
                  </div>
                </div>
              </Card>
            );
          })}
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
            walletType: "E_WALLET",
          }}
        >
          <Form.Item
            name="name"
            label={t("settings.categoryName")}
            rules={[{ required: true }]}
          >
            <Input
              maxLength={50}
              disabled={editingCat?.walletType === "CASH"}
            />
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

      {/* D3: aksi cepat "Transfer dari wadah ini" — form TRANSFER dengan
          wadah sumber sudah terisi; wadah tujuan dipilih user. */}
      <TransactionFormModal
        open={transferFrom !== null}
        editingTransaction={null}
        categories={categories}
        cycle={cycle}
        defaultType="TRANSFER"
        defaultUnitId={transferFrom?.id}
        onClose={() => setTransferFrom(null)}
        onSaved={() => void refreshCycle(cycle)}
      />
    </div>
  );
}

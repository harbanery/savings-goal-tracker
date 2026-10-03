"use client";

import {
  Alert,
  App,
  Button,
  Card,
  Form,
  InputNumber,
  Select,
  Typography,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CalendarOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  PieChartOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type {
  BudgetCategory,
  BudgetOverview,
  Transaction,
  UserSettings,
} from "@/features/web/types";
import { useCycle } from "@/features/web/hooks/cycle";
import { computeCycleStats } from "@/features/web/utils/stats";
import {
  getBudgetOverviewAction,
  getCycleTransactionsAction,
  updateSettingsAction,
} from "@/utils/server/actions";
import { formatIDR } from "@/utils/helpers";
import CategoryBreakdownList from "../CategoryBreakdownList";

const { Text } = Typography;

const ChartLoading = () => (
  <div className="flex h-[300px] items-center justify-center">Loading…</div>
);
const BudgetCompositionDoughnut = dynamic(
  () => import("../charts/BudgetCompositionDoughnut"),
  { ssr: false, loading: ChartLoading },
);

interface Props {
  initialOverview: BudgetOverview;
  initialCategories: BudgetCategory[];
  initialTransactions: Transaction[];
  settings: UserSettings;
}

interface BudgetFormValues {
  protectedSavings?: number;
  cycleStartDay?: number;
}

/** Palet aksen kartu statistik (selaras referensi Dashboard Content.svg). */
const ACCENT = {
  blue: "#5781eb",
  green: "#0dab76",
  amber: "#ffa726",
  purple: "#a127e2",
  red: "#d32f2f",
} as const;

/** Chip ikon bulat lembut (pola yang sama dengan StatsCards dashboard). */
function IconChip({ icon, color }: { icon: ReactNode; color: string }) {
  return (
    <span
      className="mb-3 flex h-10 w-10 items-center justify-center rounded-full text-base"
      style={{ backgroundColor: `${color}1f`, color }}
    >
      {icon}
    </span>
  );
}

/** Baris legend: titik warna + label + nilai (pola rincian kategori). */
function LegendRow({
  color,
  label,
  value,
  warning,
}: {
  color: string;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-2 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05]">
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <Text ellipsis className="min-w-0 text-sm">
          {label}
        </Text>
      </span>
      <Text
        strong
        className="shrink-0 text-sm tabular-nums"
        style={warning ? { color: "#ef4444" } : undefined}
      >
        {value}
      </Text>
    </div>
  );
}

/**
 * Halaman Budget (menu Keuangan) mengikuti pola referensi Dashboard
 * Content.svg: baris 5 kartu utama + 5 kartu mini, lalu satu kartu besar
 * (alokasi vs terpakai) + doughnut komposisi dana + rincian per kategori,
 * dan form pengaturan (tabungan dilindungi + tanggal mulai siklus).
 * Bisa dialokasikan = saldo awal + pemasukan − tabungan dilindungi;
 * pengeluaran yang menyentuh tabungan akan meminta konfirmasi terpaksa.
 */
export default function BudgetView({
  initialOverview,
  initialCategories,
  initialTransactions,
  settings,
}: Props) {
  const { t, locale } = useLocale();
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm<BudgetFormValues>();
  const [overview, setOverview] = useState(initialOverview);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [saving, setSaving] = useState(false);

  /** Siklus aktif global (dipilih lewat DatePicker month di navbar). */
  const { cycle } = useCycle();

  const refresh = useCallback(async () => {
    try {
      const [freshOverview, freshTransactions] = await Promise.all([
        getBudgetOverviewAction(cycle),
        getCycleTransactionsAction(cycle),
      ]);
      setOverview(freshOverview);
      setTransactions(freshTransactions);
    } catch {
      // biarkan state lama
    }
  }, [cycle]);

  const mounted = useRef(false);
  useEffect(() => {
    // Lewati fetch pertama (data awal sudah dari server).
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    refresh();
  }, [refresh]);

  async function handleSave(values: BudgetFormValues) {
    setSaving(true);
    try {
      await updateSettingsAction({
        protectedSavings: Number(values.protectedSavings ?? 0),
        cycleStartDay: Number(values.cycleStartDay ?? settings.cycleStartDay),
      });
      message.success(t("settings.saved"));
      // Refresh server component agar startDay baru tersalur ke
      // CycleProvider (batas tanggal siklus diturunkan ulang).
      router.refresh();
      await refresh();
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("settings.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(
    () =>
      computeCycleStats(
        transactions,
        initialCategories,
        overview.savingsInitial,
        overview.protectedSavings,
      ),
    [transactions, initialCategories, overview],
  );

  /** Total dana siklus = saldo awal + pemasukan. */
  const totalFunds = overview.savingsInitial + overview.totalIncome;
  /** Porsi tabungan dilindungi dari total dana (0-100). */
  const savingRatio =
    totalFunds > 0
      ? Math.min(100, Math.round((overview.protectedSavings / totalFunds) * 100))
      : null;
  /** Porsi pengeluaran dari alokasi (0-100). */
  const usedPercent =
    overview.allocatable > 0
      ? Math.min(
          100,
          Math.round((overview.totalSpent / overview.allocatable) * 100),
        )
      : overview.totalSpent > 0
        ? 100
        : 0;

  /** Waktu klien hanya dibaca setelah mount (render harus murni);
   *  null di SSR → sisa hari dihitung dari panjang siklus penuh. */
  const [nowTs, setNowTs] = useState<number | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setNowTs(Date.now());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  const cycleLengthDays = Math.max(
    1,
    Math.ceil(
      (cycle.endDate.getTime() - cycle.startDate.getTime()) / 86_400_000,
    ),
  );
  const daysLeft =
    nowTs === null
      ? cycleLengthDays
      : Math.max(
          0,
          Math.ceil((cycle.endDate.getTime() - nowTs) / 86_400_000),
        );

  const spentColor = overview.overProtected ? ACCENT.red : ACCENT.amber;

  const primary = [
    {
      key: "savingsInitial",
      label: t("stats.initialBalance"),
      value: formatIDR(overview.savingsInitial, locale),
      icon: <WalletOutlined />,
      color: ACCENT.blue,
    },
    {
      key: "totalIncome",
      label: t("finance.budgetIncome"),
      value: formatIDR(overview.totalIncome, locale),
      icon: <ArrowDownOutlined />,
      color: ACCENT.green,
    },
    {
      key: "protectedSavings",
      label: t("finance.budgetProtected"),
      value: formatIDR(overview.protectedSavings, locale),
      icon: <LockOutlined />,
      color: ACCENT.purple,
    },
    {
      key: "allocatable",
      label: t("finance.budgetAllocatable"),
      value: formatIDR(overview.allocatable, locale),
      icon: <PieChartOutlined />,
      color: ACCENT.blue,
    },
    {
      key: "totalSpent",
      label: t("finance.budgetSpent"),
      value: formatIDR(overview.totalSpent, locale),
      icon: <ArrowUpOutlined />,
      color: spentColor,
    },
  ];

  const mini = [
    {
      key: "remaining",
      label: t("finance.budgetRemaining"),
      value: formatIDR(overview.remaining, locale),
      danger: overview.remaining < 0,
    },
    {
      key: "usedPercent",
      label: t("finance.budgetUsedPercent"),
      value: `${usedPercent}%`,
    },
    {
      key: "savingRatio",
      label: t("finance.budgetSavingRatio"),
      value: savingRatio === null ? "—" : `${savingRatio}%`,
    },
    {
      key: "netSavings",
      label: t("stats.netSavings"),
      value: formatIDR(stats.netSavings, locale),
    },
    {
      key: "daysLeft",
      label: t("finance.budgetDaysLeft"),
      value: t("finance.budgetDaysLeftValue", { n: daysLeft }),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-350 flex-col gap-4">
      {overview.overProtected && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          title={t("finance.budgetOverTitle")}
          description={t("finance.budgetOverDesc", {
            spent: formatIDR(overview.totalSpent, locale),
            limit: formatIDR(overview.allocatable, locale),
          })}
        />
      )}

      {/* Baris 1 — kartu utama (ikon + nilai + label) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {primary.map((card) => (
          <Card key={card.key} size="small" className="shadow-sm">
            <IconChip icon={card.icon} color={card.color} />
            <div
              className="truncate text-xl font-semibold tabular-nums"
              title={card.value}
            >
              {card.value}
            </div>
            <Text type="secondary" className="mt-1 block text-sm">
              {card.label}
            </Text>
          </Card>
        ))}
      </div>

      {/* Baris 2 — kartu mini (label kecil + nilai) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {mini.map((card) => (
          <Card key={card.key} size="small" className="shadow-sm">
            <Text type="secondary" className="block text-xs">
              {card.label}
            </Text>
            <div
              className="mt-1 truncate text-base font-semibold tabular-nums"
              style={card.danger ? { color: "#ef4444" } : undefined}
              title={card.value}
            >
              {card.value}
            </div>
          </Card>
        ))}
      </div>

      {/* Baris 3 — kartu besar alokasi vs terpakai (kiri) + doughnut
          komposisi dana (tengah) + rincian per kategori (kanan) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Card
            variant="borderless"
            className="shadow-sm"
            style={{ height: "100%" }}
            styles={{ body: { padding: 16, height: "100%" } }}
            size="small"
            title={<Text strong>{t("finance.budgetAllocationTitle")}</Text>}
          >
            <div className="flex h-full flex-col">
              {/* Bar proporsi terpakai vs sisa alokasi */}
              <div className="mt-1 flex h-3 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  style={{
                    width: `${usedPercent}%`,
                    backgroundColor: spentColor,
                  }}
                />
                <div
                  style={{
                    width: `${Math.max(0, 100 - usedPercent)}%`,
                    backgroundColor: ACCENT.green,
                  }}
                />
              </div>

              {/* Legend rincian dana */}
              <div className="mt-3">
                <LegendRow
                  color={spentColor}
                  label={t("finance.budgetSpent")}
                  value={formatIDR(overview.totalSpent, locale)}
                  warning={overview.overProtected}
                />
                <LegendRow
                  color={ACCENT.green}
                  label={t("finance.budgetRemaining")}
                  value={formatIDR(overview.remaining, locale)}
                  warning={overview.remaining < 0}
                />
                <LegendRow
                  color={ACCENT.blue}
                  label={t("finance.budgetProtected")}
                  value={formatIDR(overview.protectedSavings, locale)}
                />
              </div>

              {/* Footer ringkasan (pola strip bawah kartu referensi) */}
              <div className="mt-auto flex items-center justify-between gap-2 rounded-lg bg-black/[0.03] px-3 py-2 dark:bg-white/[0.05]">
                <Text type="secondary" className="text-xs">
                  {t("finance.budgetTotalFunds")}
                </Text>
                <Text strong className="text-sm tabular-nums">
                  {formatIDR(totalFunds, locale)}
                </Text>
              </div>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-3">
          <BudgetCompositionDoughnut
            protectedSavings={overview.protectedSavings}
            totalSpent={overview.totalSpent}
            remaining={overview.remaining}
          />
        </div>
        <div className="lg:col-span-4">
          <Card
            variant="borderless"
            className="shadow-sm"
            style={{ height: "100%" }}
            styles={{ body: { padding: 16, height: "100%" } }}
            size="small"
          >
            <CategoryBreakdownList categories={stats.categories} />
          </Card>
        </div>
      </div>

      <Card
        variant="borderless"
        className="shadow-sm"
        title={<Text strong>{t("finance.budgetSettingTitle")}</Text>}
      >
        <p className="mb-4 text-sm opacity-70">
          {t("finance.budgetSettingHint")}
        </p>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            protectedSavings: settings.protectedSavings,
            cycleStartDay: settings.cycleStartDay,
          }}
          className="max-w-md"
        >
          <Form.Item
            name="protectedSavings"
            label={t("finance.budgetProtected")}
            rules={[{ required: true }]}
          >
            <InputNumber<number>
              style={{ width: "100%" }}
              addonBefore={locale === "en" ? "IDR" : "Rp"}
              min={0}
              step={100000}
              formatter={(v) =>
                v === undefined || v === null
                  ? ""
                  : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
              }
              parser={(v) => Number((v ?? "").replace(/\D/g, "") || 0)}
              prefix={<WalletOutlined />}
            />
          </Form.Item>
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
              suffixIcon={<CalendarOutlined />}
            />
          </Form.Item>
          <div className="flex justify-end">
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              icon={<CheckOutlined />}
            >
              {t("settings.save")}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}

"use client";

import {
  Alert,
  App,
  Button,
  Card,
  Form,
  InputNumber,
  Progress,
  Select,
  Tag,
  Tooltip,
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
  SwapOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { BudgetOverview, UserSettings } from "@/features/web/types";
import { useCycle } from "@/features/web/hooks/cycle";
import {
  applyCycleLeftoverAction,
  getBudgetOverviewAction,
  setCycleProtectedSavingsAction,
  updateSettingsAction,
} from "@/utils/server/actions";
import { formatIDR } from "@/utils/helpers";

const { Text } = Typography;

interface Props {
  initialOverview: BudgetOverview;
  settings: UserSettings;
}

interface BudgetFormValues {
  protectedSavings?: number;
  cycleStartDay?: number;
}

/** Palet aksen kartu statistik (selaras referensi Dashboard Content.svg). */
const ACCENT = {
  green: "#0dab76",
  amber: "#ffa726",
  purple: "#a127e2",
  red: "#d32f2f",
  blue: "#5781eb",
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

/**
 * Halaman Budget (menu Keuangan): empat kartu ringkasan siklus —
 * Pemasukan Siklus Ini, Tabungan Dilindungi, Bisa Dialokasikan, Terpakai —
 * plus form pengaturan (tabungan dilindungi + tanggal mulai siklus).
 * Bisa dialokasikan = saldo awal + pemasukan − tabungan dilindungi;
 * pengeluaran yang menyentuh tabungan akan meminta konfirmasi terpaksa.
 */
export default function BudgetView({ initialOverview, settings }: Props) {
  const { t, locale } = useLocale();
  const { message, modal } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm<BudgetFormValues>();
  const [overview, setOverview] = useState(initialOverview);
  const [saving, setSaving] = useState(false);
  /** Sedang memindahkan sisa dompet ke tabungan dilindungi (akhir siklus). */
  const [applyingLeftover, setApplyingLeftover] = useState(false);

  /** Siklus aktif global (dipilih lewat DatePicker month di navbar). */
  const { cycle } = useCycle();

  const refresh = useCallback(async () => {
    try {
      setOverview(await getBudgetOverviewAction(cycle));
    } catch {
      // biarkan state lama
    }
  }, [cycle]);

  const mounted = useRef(false);
  useEffect(() => {
    // Lewati fetch pertama (initialOverview sudah dari server).
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    refresh();
  }, [refresh]);

  // Tabungan dilindungi DINAMIS PER SIKLUS: saat siklus berganti (DatePicker
  // navbar) nilai di form harus ikut nilai siklus itu — antd Form hanya
  // menerapkan initialValues saat mount, jadi disinkronkan manual di sini.
  useEffect(() => {
    form.setFieldValue("protectedSavings", overview.protectedSavingsBase);
  }, [form, overview.protectedSavingsBase, overview.protectedSavingsLeftover]);

  async function handleSave(values: BudgetFormValues) {
    setSaving(true);
    try {
      // Tanggal mulai siklus tetap pengaturan global user (bukan per siklus).
      const startDay = Number(values.cycleStartDay ?? settings.cycleStartDay);
      if (startDay !== settings.cycleStartDay) {
        await updateSettingsAction({ cycleStartDay: startDay });
      }
      // Tabungan dilindungi kini PER SIKLUS (dinamis) — disimpan ke siklus
      // aktif, bukan lagi satu nilai global (DROID.md). Siklus yang sudah
      // dikunci (hari terakhir siklus) dilewati: nilainya sudah final.
      if (!overview.settled) {
        await setCycleProtectedSavingsAction(
          cycle,
          Number(values.protectedSavings ?? 0),
        );
      }
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

  /** Pindahkan sisa saldo semua dompet ke tabungan dilindungi (akhir siklus). */
  async function handleApplyLeftover() {
    modal.confirm({
      title: t("finance.budgetLeftoverConfirmTitle"),
      content: t("finance.budgetLeftoverConfirmDesc", {
        amount: formatIDR(overview.leftover, locale),
      }),
      okText: t("finance.budgetLeftoverConfirmOk"),
      cancelText: t("common.cancel"),
      onOk: async () => {
        setApplyingLeftover(true);
        try {
          await applyCycleLeftoverAction(cycle);
          message.success(t("finance.budgetLeftoverSuccess"));
          router.refresh();
          await refresh();
        } catch (err) {
          message.error(
            err instanceof Error ? err.message : t("settings.saveFailed"),
          );
        } finally {
          setApplyingLeftover(false);
        }
      },
    });
  }

  /** Warna kartu Terpakai: merah bila sudah menyentuh tabungan. */
  const spentColor = overview.overProtected ? ACCENT.red : ACCENT.amber;

  /**
   * Persentase Terpakai vs Bisa Dialokasikan (D5). Bisa > 100 saat
   * over-protection (bar penuh, angka tetap ditampilkan apa adanya);
   * alokasi <= 0 dengan pengeluaran > 0 dianggap 100%.
   */
  const usagePercent =
    overview.allocatable > 0
      ? Math.round((overview.totalSpent / overview.allocatable) * 100)
      : overview.totalSpent > 0
        ? 100
        : 0;

  const primary = [
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

  return (
    <div className="mx-auto flex w-full flex-col gap-4">
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

      {/* Baris kartu ringkasan (ikon + nilai + label) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {primary.map((card) => (
          <Card key={card.key} size="small" className="shadow-sm!">
            <IconChip icon={card.icon} color={card.color} />
            <div
              className="truncate text-4xl font-normal tabular-nums"
              title={card.value}
            >
              {card.value}
            </div>
            <Text type="secondary" className="mt-1! block! text-sm!">
              {card.label}
            </Text>
          </Card>
        ))}
      </div>

      {/* D5: progress bar Terpakai vs Bisa Dialokasikan (visual, bukan hanya
          angka) + riwayat pelanggaran ("X kali dipaksa siklus ini"). */}
      <Card
        variant="borderless"
        className="shadow-sm!"
        title={<Text strong>{t("finance.budgetProgressTitle")}</Text>}
      >
        <Progress
          percent={usagePercent}
          status={overview.overProtected ? "exception" : "normal"}
          strokeColor={overview.overProtected ? ACCENT.red : ACCENT.green}
        />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <Text type="secondary" className="text-sm!">
            {t("finance.budgetProgressLegend", {
              spent: formatIDR(overview.totalSpent, locale),
              allocatable: formatIDR(overview.allocatable, locale),
            })}
          </Text>
          <Text
            type={overview.remaining < 0 ? "danger" : "secondary"}
            className="text-sm!"
          >
            {overview.remaining >= 0
              ? t("finance.budgetRemaining", {
                  amount: formatIDR(overview.remaining, locale),
                })
              : t("finance.budgetOverBy", {
                  amount: formatIDR(Math.abs(overview.remaining), locale),
                })}
          </Text>
        </div>
        {overview.forcedCount > 0 && (
          <Alert
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined />}
            className="mt-3!"
            title={t("finance.budgetForcedTitle")}
            description={t("finance.budgetForcedCount", {
              n: overview.forcedCount,
            })}
          />
        )}
      </Card>

      {/* Siklus berjalan: status penguncian nilai (hari terakhir siklus) +
          tombol "pindahkan sisa dompet" ke tabungan dilindungi. */}
      <Card
        variant="borderless"
        className="shadow-sm!"
        title={
          <Text strong>
            {t("finance.budgetCycleStatusTitle", { cycle: cycle.label })}
          </Text>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {overview.settled ? (
              <Tag color="purple" icon={<LockOutlined />}>
                {t("finance.budgetSettledTag")}
              </Tag>
            ) : (
              <Tag color="default" icon={<CalendarOutlined />}>
                {t("finance.budgetOpenTag")}
              </Tag>
            )}
            {overview.walletLocked && (
              <Tag color="red">{t("finance.budgetWalletLockedTag")}</Tag>
            )}
          </div>

          <Text type="secondary" className="text-sm!">
            {overview.settled
              ? t("finance.budgetSettledHint")
              : t("finance.budgetOpenHint")}
          </Text>

          {/* Rincian tabungan dilindungi: nilai dasar + sisa yang dipindahkan. */}
          {overview.protectedSavingsLeftover > 0 && (
            <Text type="secondary" className="text-sm!">
              {t("finance.budgetLeftoverBreakdown", {
                base: formatIDR(overview.protectedSavingsBase, locale),
                leftover: formatIDR(
                  overview.protectedSavingsLeftover,
                  locale,
                ),
              })}
            </Text>
          )}

          {/* Sisa saldo seluruh dompet + tombol pindah (hanya akhir siklus,
              dan belum pernah dipindahkan pada siklus ini). */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text className="text-sm!">
              {t("finance.budgetLeftoverLabel", {
                amount: formatIDR(overview.leftover, locale),
              })}
            </Text>
            <Tooltip
              title={
                overview.canApplyLeftover
                  ? undefined
                  : t("finance.budgetLeftoverUnavailable")
              }
            >
              <Button
                icon={<SwapOutlined />}
                loading={applyingLeftover}
                disabled={!overview.canApplyLeftover}
                onClick={handleApplyLeftover}
              >
                {overview.walletLocked
                  ? t("finance.budgetLeftoverDone")
                  : t("finance.budgetLeftoverAction")}
              </Button>
            </Tooltip>
          </div>
        </div>
      </Card>

      <Card
        variant="borderless"
        className="shadow-sm!"
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
            protectedSavings: overview.protectedSavingsBase,
            cycleStartDay: settings.cycleStartDay,
          }}
        >
          {/* Dua pengaturan berdampingan di layar lebar (satu kolom di mobile)
              agar kartu tidak menyisakan ruang kosong di sisi kanan. */}
          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
            <Form.Item
              name="protectedSavings"
              label={t("finance.budgetProtected")}
              // Siklus yang sudah dikunci (hari terakhir siklus) tidak bisa
              // diubah lagi — tombol simpan ikut dinonaktifkan.
              extra={
                overview.settled
                  ? t("finance.budgetProtectedSettledHint")
                  : t("finance.budgetProtectedHint")
              }
              rules={[{ required: true }]}
            >
              <InputNumber<number>
                style={{ width: "100%" }}
                addonBefore={locale === "en" ? "IDR" : "Rp"}
                min={0}
                step={100000}
                disabled={overview.settled}
                formatter={(v) =>
                  v === undefined || v === null
                    ? ""
                    : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                }
                parser={(v) => Number((v ?? "").replace(/\D/g, "") || 0)}
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
          </div>
          <div className="flex justify-end">
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              disabled={overview.settled}
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

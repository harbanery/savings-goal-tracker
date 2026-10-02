"use client";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  SafetyOutlined,
  SwapOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Card, Typography } from "antd";
import { useEffect, useState, type ReactNode } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { CycleInfo } from "@/features/web/utils/cycle";
import type { CycleStats } from "@/features/web/utils/stats";
import { formatIDR } from "@/utils/helpers";

const { Text } = Typography;

interface Props {
  stats: CycleStats;
  /** Tabungan dilindungi per siklus (settings user). */
  protectedSavings: number;
  /** Siklus aktif — untuk rata-rata pengeluaran harian. */
  cycle: CycleInfo;
}

/** Palet aksen kartu statistik (selaras referensi Dashboard Content.svg). */
const ACCENT = {
  blue: "#5781eb",
  green: "#0dab76",
  amber: "#ffa726",
  purple: "#a127e2",
  red: "#d32f2f",
} as const;

interface StatCardSpec {
  key: string;
  label: string;
  value: string;
  icon: ReactNode;
  color: string;
  /** Warna nilai: merah bila kondisi buruk, hijau bila baik. */
  tone?: "positive" | "negative" | "warning";
}

interface MiniCardSpec {
  key: string;
  label: string;
  value: string;
}

/** Chip ikon bulat lembut (latar versi terang dari warna aksen). */
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
 * Kartu ringkasan dashboard sesuai referensi Dashboard Content.svg:
 * baris pertama 5 kartu utama (ikon + nilai besar + label) — Saldo Bersih,
 * Pemasukan, Pengeluaran, Cash Flow, Sisa Limit; baris kedua 5 kartu mini
 * (label kecil + nilai) — Saldo Awal, Tabungan Dilindungi, Limit Terpakai,
 * Jumlah Transaksi, Rata-rata Harian.
 */
export default function StatsCards({
  stats,
  protectedSavings,
  cycle,
}: Readonly<Props>) {
  const { t, locale } = useLocale();

  const cashFlow = stats.totalIncome - stats.totalSpent;

  /** Waktu klien hanya dibaca setelah mount (render harus murni);
   *  null di SSR → rata-rata dihitung dari panjang siklus penuh. */
  const [nowTs, setNowTs] = useState<number | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setNowTs(Date.now());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  /** Hari berjalan siklus (min 1) untuk rata-rata harian. */
  const elapsedDays = Math.max(
    1,
    Math.ceil(
      ((nowTs ?? cycle.endDate.getTime()) -
        cycle.startDate.getTime()) /
        86_400_000,
    ),
  );
  const dailyAvg = stats.totalSpent / elapsedDays;

  const primary: StatCardSpec[] = [
    {
      key: "netSavings",
      label: t("stats.netSavings"),
      value: formatIDR(stats.netSavings, locale),
      icon: <WalletOutlined />,
      color: ACCENT.blue,
      tone:
        stats.netSavings >= stats.savingsInitial ? "positive" : "negative",
    },
    {
      key: "totalIncome",
      label: t("stats.totalIncome"),
      value: formatIDR(stats.totalIncome, locale),
      icon: <ArrowDownOutlined />,
      color: ACCENT.green,
      tone: "positive",
    },
    {
      key: "totalSpent",
      label: t("stats.totalSpent"),
      value: formatIDR(stats.totalSpent, locale),
      icon: <ArrowUpOutlined />,
      color: ACCENT.amber,
      tone: stats.overLimit ? "negative" : "warning",
    },
    {
      key: "cashFlow",
      label: t("stats.cashFlow"),
      value: formatIDR(cashFlow, locale),
      icon: <SwapOutlined />,
      color: ACCENT.purple,
      tone: cashFlow >= 0 ? "positive" : "negative",
    },
    {
      key: "limitRemaining",
      label: t("stats.limitRemaining"),
      value: formatIDR(stats.limitRemaining, locale),
      icon: <SafetyOutlined />,
      color: stats.limitRemaining >= 0 ? ACCENT.green : ACCENT.red,
      tone: stats.limitRemaining >= 0 ? "positive" : "negative",
    },
  ];

  const mini: MiniCardSpec[] = [
    {
      key: "savingsInitial",
      label: t("stats.initialBalance"),
      value: formatIDR(stats.savingsInitial, locale),
    },
    {
      key: "protected",
      label: t("finance.budgetProtected"),
      value: formatIDR(protectedSavings, locale),
    },
    {
      key: "limitUsed",
      label: t("stats.limitUsed"),
      value: `${stats.limitPercent}%`,
    },
    {
      key: "transactionCount",
      label: t("stats.transactionCount"),
      value: String(stats.transactionCount),
    },
    {
      key: "dailyAvg",
      label: t("stats.dailyAvg"),
      value: formatIDR(Math.round(dailyAvg), locale),
    },
  ];

  const toneColor: Record<"positive" | "negative" | "warning", string> = {
    positive: "#16a34a",
    negative: "#ef4444",
    warning: "#d97706",
  };

  return (
    <div className="mb-4 space-y-4">
      {/* Baris 1 — kartu utama (ikon + nilai + label) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {primary.map((card) => (
          <Card key={card.key} size="small" className="shadow-sm">
            <IconChip icon={card.icon} color={card.color} />
            <div
              className="truncate text-xl font-semibold tabular-nums"
              style={{ color: card.tone ? toneColor[card.tone] : undefined }}
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
              title={card.value}
            >
              {card.value}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

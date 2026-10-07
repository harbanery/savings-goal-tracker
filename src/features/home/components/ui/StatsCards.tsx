"use client";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  RiseOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { Card, Divider, Typography } from "antd";
import { useEffect, useState, type ReactNode } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { CycleInfo } from "@/features/web/utils/cycle";
import type { CycleStats } from "@/features/web/utils/stats";
import { formatIDR } from "@/utils/helpers";

const { Text } = Typography;

/** Total seluruh waktu (kartu utama). */
export interface AllTimeTotals {
  income: number;
  spent: number;
}

interface Props {
  stats: CycleStats;
  /** Total pemasukan & pengeluaran seluruh waktu (kartu utama). */
  allTime: AllTimeTotals;
  /** Siklus aktif — untuk rata-rata pengeluaran harian. */
  cycle: CycleInfo;
}

/** Palet aksen kartu statistik. */
const ACCENT = {
  green: "#0dab76",
  amber: "#ffa726",
  purple: "#a127e2",
  red: "#d32f2f",
} as const;

interface MainCardSpec {
  key: string;
  title: string;
  value: string;
  desc: string;
  icon: ReactNode;
  color: string;
  /** Warna nilai: hijau bila baik, merah bila buruk. */
  tone?: "positive" | "negative";
}

interface MiniCardSpec {
  key: string;
  label: string;
  value: string;
  tone?: "positive" | "negative";
}

/** Chip ikon persegi rounded (referensi public/references/Frame 427320104.svg). */
function IconChip({
  icon,
  color,
}: Readonly<{ icon: ReactNode; color: string }>) {
  return (
    <span
      className="mb-2 flex h-10 w-10 items-center justify-center rounded-full text-base"
      style={{ backgroundColor: `${color}1f`, color }}
    >
      {icon}
    </span>
  );
}

/**
 * Kartu statistik dashboard:
 * - Kartu utama (seluruh waktu, data tidak per siklus), tiap kartu terdiri
 *   dari ikon + judul + jumlah + deskripsi — mengikuti referensi
 *   public/references/Frame 427320104.svg: Total Pemasukan, Total
 *   Pengeluaran, Cash Flow, Keuntungan (saving rate %).
 * - Kartu mini pencapaian siklus aktif (satu judul "Pencapaian Siklus Ini"
 *   di atas, dipisah divider dari kartu utama): jumlah transaksi, saldo,
 *   rata-rata harian, sisa limit.
 */
export default function StatsCards({ stats, allTime, cycle }: Readonly<Props>) {
  const { t, locale } = useLocale();

  const cashFlow = allTime.income - allTime.spent;
  /** Saving rate: persentase pemasukan yang berhasil disimpan. */
  const savingRate =
    allTime.income > 0 ? Math.round((cashFlow / allTime.income) * 100) : 0;

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
      ((nowTs ?? cycle.endDate.getTime()) - cycle.startDate.getTime()) /
        86_400_000,
    ),
  );
  const dailyAvg = stats.totalSpent / elapsedDays;

  const primary: MainCardSpec[] = [
    {
      key: "totalIncome",
      title: t("stats.totalIncome"),
      value: formatIDR(allTime.income, locale),
      desc: t("stats.incomeDesc"),
      icon: <ArrowDownOutlined />,
      color: ACCENT.green,
    },
    {
      key: "totalSpent",
      title: t("stats.totalSpent"),
      value: formatIDR(allTime.spent, locale),
      desc: t("stats.spentDesc"),
      icon: <ArrowUpOutlined />,
      color: ACCENT.amber,
    },
    {
      key: "cashFlow",
      title: t("stats.cashFlow"),
      value: formatIDR(cashFlow, locale),
      desc: t("stats.cashFlowDesc"),
      icon: <SwapOutlined />,
      color: ACCENT.purple,
      tone: cashFlow >= 0 ? "positive" : "negative",
    },
    {
      key: "profit",
      title: t("stats.profit"),
      value: `${savingRate}%`,
      desc: t("stats.profitDesc"),
      icon: <RiseOutlined />,
      color: savingRate >= 0 ? ACCENT.green : ACCENT.red,
      tone: savingRate >= 0 ? "positive" : "negative",
    },
  ];

  const mini: MiniCardSpec[] = [
    {
      key: "transactionCount",
      label: t("stats.transactionCount"),
      value: String(stats.transactionCount),
    },
    {
      key: "balance",
      label: t("stats.balanceCycle"),
      value: formatIDR(stats.netSavings, locale),
      tone: stats.netSavings >= stats.savingsInitial ? "positive" : "negative",
    },
    {
      key: "dailyAvg",
      label: t("stats.dailyAvg"),
      value: formatIDR(Math.round(dailyAvg), locale),
    },
    {
      key: "limitRemaining",
      label: t("stats.limitRemainingCycle"),
      value: formatIDR(stats.limitRemaining, locale),
      tone: stats.limitRemaining >= 0 ? "positive" : "negative",
    },
  ];

  const toneColor: Record<"positive" | "negative", string> = {
    positive: "#16a34a",
    negative: "#ef4444",
  };

  return (
    <div className="mb-4">
      {/* Baris utama — 4 kartu seluruh waktu (ikon + judul + jumlah +
          deskripsi), gaya referensi Frame 427320104.svg */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {primary.map((card) => (
          <Card key={card.key} size="small" className="shadow-sm">
            <IconChip icon={card.icon} color={card.color} />
            <Text type="secondary" className="block text-sm">
              {card.title}
            </Text>
            <div
              className="mt-1 truncate text-4xl font-normal tabular-nums"
              style={{ color: card.tone ? toneColor[card.tone] : undefined }}
              title={card.value}
            >
              {card.value}
            </div>
            <Text type="secondary" className="mt-1 block text-xs">
              {card.desc}
            </Text>
          </Card>
        ))}
      </div>

      {/* Pemisah kartu utama ↔ kartu mini siklus */}
      <Divider className="my-4!" />

      {/* Kartu mini — satu judul "Pencapaian Siklus Ini" untuk semua kartu */}
      <Text strong className="mb-2 block">
        {t("stats.cycleAchievement")}
      </Text>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {mini.map((card) => (
          <Card key={card.key} size="small" className="shadow-sm">
            <Text type="secondary" className="block text-xs">
              {card.label}
            </Text>
            <div
              className="mt-1 truncate text-2xl font-medium tabular-nums"
              style={{ color: card.tone ? toneColor[card.tone] : undefined }}
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

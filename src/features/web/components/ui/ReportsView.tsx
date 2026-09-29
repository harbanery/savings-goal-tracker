"use client";

import { BulbOutlined } from "@ant-design/icons";
import { Typography } from "antd";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getCycleTransactionsAction } from "@/utils/server/actions";
import { computeCycleStats } from "@/features/web/utils/stats";
import type {
  BudgetCategory,
  Transaction,
  UserSettings,
} from "@/features/web/types";
import { useCycle } from "@/features/web/hooks/cycle";
import type { CycleInfo } from "@/features/web/utils/cycle";
import CategoryBreakdown from "./CategoryBreakdown";

const TopKeywordsInsights = dynamic(() => import("./TopKeywordsInsights"), {
  ssr: false,
});

const { Title } = Typography;

/** Judul sub-bagian laporan. */
function ReportSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        <span className="text-indigo-500 dark:text-indigo-400">{icon}</span>
        <Title level={5} style={{ marginBottom: 0 }}>
          {title}
        </Title>
      </div>
      {children}
    </section>
  );
}

interface Props {
  initialTransactions: Transaction[];
  categories: BudgetCategory[];
  settings: UserSettings;
}

/**
 * Halaman Laporan (generate_web.md): alokasi wadah + insight keyword.
 * Grafik historis (donut saldo, pie kategori, bar alokasi bulanan,
 * perbandingan & kumulatif tabungan) dipindah ke Dashboard.
 */
export default function ReportsView({
  initialTransactions,
  categories,
  settings,
}: Readonly<Props>) {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);

  /** Siklus aktif global (dipilih lewat DatePicker month di navbar). */
  const { cycle } = useCycle();

  const { t } = useLocale();

  const stats = useMemo(
    () => computeCycleStats(transactions, categories, settings.savingsInitial),
    [transactions, categories, settings.savingsInitial],
  );

  const refreshCycle = useCallback(async (targetCycle: CycleInfo) => {
    try {
      setTransactions(await getCycleTransactionsAction(targetCycle));
    } catch (err) {
      console.error("[ReportsView] gagal memuat transaksi:", err);
      setTransactions([]);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    refreshCycle(cycle).catch(() => {});
  }, [cycle, refreshCycle]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="mx-auto w-full max-w-350">
      {/* Alokasi wadah (dipindah dari dashboard) */}
      <CategoryBreakdown stats={stats} />

      <ReportSection icon={<BulbOutlined />} title={t("app.tabFacts")}>
        <TopKeywordsInsights
          transactions={transactions}
          categories={categories}
        />
      </ReportSection>
    </div>
  );
}

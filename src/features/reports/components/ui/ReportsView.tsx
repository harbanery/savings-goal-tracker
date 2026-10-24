"use client";

import {
  BarChartOutlined,
  BulbOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { App, Button, Select, Tooltip, Typography } from "antd";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  getHistoricalTransactionsAction,
  getRangeTransactionsAction,
} from "@/utils/server/actions";
import type {
  BudgetCategory,
  Transaction,
} from "@/features/web/types";
import { useCycle } from "@/features/web/hooks/cycle";
import {
  formatCycleLabel,
  shiftCycle,
  type CycleInfo,
} from "@/features/web/utils/cycle";
import { getTopKeywords } from "@/features/reports/utils/keywordStats";
import { generateReportCsv } from "@/features/reports/utils/reportCsv";
import {
  compareCyclesByCategory,
  getQuickInsights,
} from "@/features/reports/utils/reportStats";
import { trackEvent } from "@/components/ui/vercel/track";
import QuickInsightsCard from "./QuickInsightsCard";
import CycleComparisonCard from "./CycleComparisonCard";

const TopKeywordsInsights = dynamic(() => import("./TopKeywordsInsights"), {
  ssr: false,
});

const { Title } = Typography;

/**
 * Opsi rentang laporan lintas siklus (rekomendasi D7 — rentang kustom
 * multi-siklus; opsi sama dengan halaman Transaksi).
 * 0 = semua waktu, 1 = siklus aktif (default), N = N siklus terakhir.
 */
const RANGE_OPTIONS = [1, 3, 6, 12, 0] as const;

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
}

/** Download CSV ke perangkat (dengan BOM UTF-8 agar Excel aman). */
function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Halaman Laporan (generate_web.md + rekomendasi D7): insight keyword,
 * ringkasan cepat (hari paling boros, rata-rata, tetap vs variabel),
 * perbandingan siklus per wadah, rentang kustom multi-siklus, dan
 * export laporan CSV. Grafik historis ada di Dashboard.
 */
export default function ReportsView({
  initialTransactions,
  categories,
}: Readonly<Props>) {
  /** Transaksi pada rentang laporan aktif (keyword + ringkasan cepat). */
  const [rangeTransactions, setRangeTransactions] =
    useState<Transaction[]>(initialTransactions);
  /** Transaksi siklus aktif + sebelumnya (perbandingan siklus). */
  const [currentTransactions, setCurrentTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [previousTransactions, setPreviousTransactions] = useState<
    Transaction[]
  >([]);
  const [range, setRange] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  /** Siklus aktif global (dipilih lewat DatePicker month di navbar). */
  const { cycle } = useCycle();

  const { t, locale } = useLocale();
  const { message } = App.useApp();

  /**
   * D7: muat data sesuai siklus + rentang aktif. Perbandingan siklus
   * selalu memakai pasangan siklus aktif vs sebelumnya lewat
   * getHistoricalTransactionsAction(cycle, 2) — 1 action, 2 siklus.
   */
  const refreshData = useCallback(
    async (targetCycle: CycleInfo, targetRange: number) => {
      const [rangeRes, histRes] = await Promise.allSettled([
        getRangeTransactionsAction(targetCycle, targetRange),
        getHistoricalTransactionsAction(targetCycle, 2),
      ]);
      if (rangeRes.status === "fulfilled") {
        setRangeTransactions(rangeRes.value);
      } else {
        console.error("[ReportsView] gagal memuat rentang:", rangeRes.reason);
      }
      if (histRes.status === "fulfilled") {
        const prev = shiftCycle(targetCycle, -1);
        setCurrentTransactions(histRes.value[targetCycle.key] ?? []);
        setPreviousTransactions(histRes.value[prev.key] ?? []);
      } else {
        console.error("[ReportsView] gagal memuat historis:", histRes.reason);
      }
    },
    [],
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refreshData(cycle, range)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cycle, range, refreshData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /** Export laporan CSV (rekomendasi D7) mengikuti rentang aktif. */
  function handleExport() {
    if (rangeTransactions.length === 0) {
      message.warning(t("io.noDataExport"));
      return;
    }
    const csv = generateReportCsv({
      t,
      locale,
      cycleLabel: formatCycleLabel(cycle.year, cycle.monthIndex, locale),
      insights: getQuickInsights(rangeTransactions),
      comparison: compareCyclesByCategory(
        currentTransactions,
        previousTransactions,
        categories,
      ),
      keywords: getTopKeywords(rangeTransactions, categories, 10),
    });
    downloadCsv(csv, `laporan-${cycle.key}.csv`);
    trackEvent("report_exported", { range });
  }

  return (
    <div className="mx-auto w-full max-w-350">
      {/* Toolbar: rentang laporan (multi-siklus) + export CSV. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select
          size="small"
          value={range}
          disabled={loading}
          onChange={(v) => setRange(v)}
          options={RANGE_OPTIONS.map((n) => ({
            value: n,
            label:
              n === 1
                ? t("transactions.rangeCycle")
                : n === 0
                  ? t("transactions.rangeAll")
                  : t("transactions.rangeCycles", { n }),
          }))}
          aria-label={t("reports.rangeAria")}
          style={{ minWidth: 140 }}
        />
        <Tooltip title={t("reports.exportTooltip")}>
          <Button
            icon={<DownloadOutlined />}
            disabled={rangeTransactions.length === 0}
            onClick={handleExport}
          >
            {t("reports.export")}
          </Button>
        </Tooltip>
      </div>

      <ReportSection
        icon={<ThunderboltOutlined />}
        title={t("reports.quickTitle")}
      >
        <QuickInsightsCard transactions={rangeTransactions} />
      </ReportSection>

      <ReportSection icon={<BulbOutlined />} title={t("app.tabFacts")}>
        <TopKeywordsInsights
          transactions={rangeTransactions}
          categories={categories}
        />
      </ReportSection>

      <ReportSection
        icon={<BarChartOutlined />}
        title={t("reports.comparisonTitle")}
      >
        <CycleComparisonCard
          current={currentTransactions}
          previous={previousTransactions}
          categories={categories}
          cycle={cycle}
        />
      </ReportSection>
    </div>
  );
}

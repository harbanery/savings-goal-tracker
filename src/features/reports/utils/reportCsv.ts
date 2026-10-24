import type { Locale } from "@/types/locale";
import { formatIDR } from "@/utils/helpers";
import { formatDateLabel } from "@/features/web/utils/cycle";
import type { KeywordStat } from "./keywordStats";
import type { CycleComparison, QuickInsights } from "./reportStats";

/**
 * Generate CSV laporan (rekomendasi D7 — export laporan).
 * Berisi 3 section: perbandingan siklus per wadah, ringkasan cepat,
 * dan top keyword transaksi. Label mengikuti locale aktif.
 */

/** Fungsi terjemahan dari useLocale() (dilewatkan agar util tetap murni). */
export type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export interface ReportCsvInput {
  t: TranslateFn;
  locale: Locale;
  /** Label siklus aktif, mis. "Oktober 2026". */
  cycleLabel: string;
  comparison: CycleComparison;
  insights: QuickInsights;
  keywords: KeywordStat[];
}

/** Generate isi CSV laporan (tanpa BOM — ditambahkan saat download). */
export function generateReportCsv({
  t,
  locale,
  cycleLabel,
  comparison,
  insights,
  keywords,
}: ReportCsvInput): string {
  const lines: string[] = [];

  // Section 1: perbandingan siklus per wadah.
  lines.push(escapeCsv(t("reports.csvComparison")), escapeCsv(cycleLabel), "");
  lines.push(
    [
      escapeCsv(t("reports.colWallet")),
      escapeCsv(t("reports.comparisonCurrent")),
      escapeCsv(t("reports.comparisonPrevious")),
      escapeCsv(t("reports.comparisonChange")),
    ].join(","),
  );
  for (const row of comparison.rows) {
    lines.push(
      [
        escapeCsv(row.name),
        String(row.current),
        String(row.previous),
        escapeCsv(
          row.isNew
            ? t("reports.comparisonNew")
            : row.pct === null
              ? ""
              : `${row.pct > 0 ? "+" : ""}${row.pct}%`,
        ),
      ].join(","),
    );
  }
  lines.push(
    [
      escapeCsv(t("reports.comparisonTotal")),
      String(comparison.total.current),
      String(comparison.total.previous),
      escapeCsv(
        comparison.total.pct === null
          ? ""
          : `${comparison.total.pct > 0 ? "+" : ""}${comparison.total.pct}%`,
      ),
    ].join(","),
  );

  // Section 2: ringkasan cepat.
  lines.push("", escapeCsv(t("reports.csvInsights")), "");
  lines.push(
    [
      escapeCsv(t("reports.peakDay")),
      escapeCsv(
        insights.peakDay
          ? `${formatDateLabel(new Date(insights.peakDay.date), locale)} — ${formatIDR(insights.peakDay.total, locale)}`
          : "-",
      ),
    ].join(","),
  );
  lines.push(
    [
      escapeCsv(t("reports.avgPerTransaction")),
      escapeCsv(
        `${formatIDR(insights.avgPerExpense, locale)} (${t("reports.avgTransactions", { n: insights.expenseCount })})`,
      ),
    ].join(","),
  );
  lines.push(
    [
      escapeCsv(t("reports.fixedVariable")),
      escapeCsv(
        t("reports.fixedVariableDesc", {
          fixed: formatIDR(insights.fixedTotal, locale),
          variable: formatIDR(insights.variableTotal, locale),
        }),
      ),
    ].join(","),
  );

  // Section 3: top keyword.
  lines.push("", escapeCsv(t("insights.topKeywordsTitle")), "");
  lines.push(
    [
      escapeCsv(t("reports.csvKeyword")),
      escapeCsv(t("reports.csvCount")),
      escapeCsv(t("reports.csvTotal")),
    ].join(","),
  );
  for (const kw of keywords) {
    lines.push(
      [
        escapeCsv(kw.label),
        String(kw.count),
        String(kw.totalSpent),
      ].join(","),
    );
  }

  return lines.join("\n");
}

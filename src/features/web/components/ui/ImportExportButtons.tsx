"use client";

import {
  DownloadOutlined,
  FileExcelOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { App, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useRef, useState } from "react";
import { importTransactionsAction } from "@/utils/server/actions";
import {
  generateTransactionsCsv,
  generateTemplateCsv,
  parseCsvToTransactions,
} from "@/features/web/utils/csv";
import type {
  BudgetCategory,
  Transaction,
} from "@/features/web/types";
import { useLocale } from "@/components/i18n/LocaleProvider";

interface Props {
  transactions: Transaction[];
  categories: BudgetCategory[];
  onImported: () => void;
}

/** Download CSV ke perangkat pengguna (dengan BOM UTF-8 agar Excel aman). */
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
 * Multiple button Import (Dropdown.Button): button utama "Import"
 * langsung membuka file dialog CSV, sedangkan panah dropdown berisi
 * Export CSV dan Download Template (kompatibel Google Sheets).
 * Diposisikan di samping kiri tombol Tambah Transaksi di luar tabel.
 */
export default function ImportExportButtons({
  transactions,
  categories,
  onImported,
}: Readonly<Props>) {
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLocale();
  const { message } = App.useApp();

  /** Download template CSV kosong (dengan contoh). */
  function handleDownloadTemplate() {
    downloadCsv(generateTemplateCsv(categories), "template-transaksi.csv");
  }

  /** Export transaksi siklus aktif ke CSV. */
  function handleExport() {
    if (transactions.length === 0) {
      message.warning(t("io.noDataExport"));
      return;
    }
    downloadCsv(
      generateTransactionsCsv(transactions, categories),
      "transaksi.csv",
    );
  }

  /** Buka file dialog untuk import CSV (button utama). */
  function handleImportClick() {
    fileInputRef.current?.click();
  }

  /** Parse & import file CSV yang dipilih. */
  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    // Reset value agar file yang sama bisa dipilih ulang.
    event.target.value = "";
    if (!file) return;

    let text: string;
    try {
      text = await file.text();
    } catch {
      message.error(t("io.fileEmpty"));
      return;
    }
    if (!text) {
      message.error(t("io.fileEmpty"));
      return;
    }

    const { valid, errors } = parseCsvToTransactions(text, categories);
    if (valid.length === 0) {
      message.error(
        t("io.noValid", { n: errors.length, first: errors[0] ?? "" }),
      );
      return;
    }
    setImporting(true);
    try {
      const result = await importTransactionsAction(valid);
      if (result.imported > 0) {
        message.success(
          result.errors.length > 0
            ? t("io.importedPartial", {
                n: result.imported,
                m: result.errors.length,
              })
            : t("io.imported", { n: result.imported }),
        );
        onImported();
      } else {
        message.error(t("io.importNone"));
      }
    } catch (err) {
      message.error(
        t("io.importFail", {
          msg: err instanceof Error ? err.message : String(err),
        }),
      );
    } finally {
      setImporting(false);
    }
  }

  /** Item menu dropdown: Export CSV + Download Template. */
  const items: MenuProps["items"] = [
    {
      key: "export",
      icon: <FileExcelOutlined />,
      label: t("io.export"),
      disabled: transactions.length === 0,
      title: t("io.exportTooltip"),
    },
    {
      key: "template",
      icon: <DownloadOutlined />,
      label: t("io.template"),
      title: t("io.templateTooltip"),
    },
  ];

  return (
    <>
      {/* Hidden input file untuk import CSV */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />
      <Dropdown.Button
        loading={importing}
        menu={{
          items,
          onClick: ({ key }) => {
            if (key === "export") handleExport();
            if (key === "template") handleDownloadTemplate();
          },
        }}
        onClick={handleImportClick}
        placement="bottomRight"
        trigger={["click"]}
      >
        <span className="flex items-center gap-1">
          <UploadOutlined />
          {t("io.import")}
        </span>
      </Dropdown.Button>
    </>
  );
}

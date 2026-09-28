"use client";

import {
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import { App, Button, Space, Tooltip, Upload } from "antd";
import type { UploadProps } from "antd";
import { useState } from "react";
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

/** Tombol Download Template, Export CSV, dan Import CSV (kompatibel Google Sheets). */
export default function ImportExportButtons({
  transactions,
  categories,
  onImported,
}: Props) {
  const [importing, setImporting] = useState(false);
  const { t } = useLocale();
  const { message } = App.useApp();

  /** Download template CSV kosong (dengan contoh). */
  function handleDownloadTemplate() {
    const csv = generateTemplateCsv(categories);
    downloadCsv(csv, "template-transaksi.csv");
  }

  /** Export transaksi siklus aktif ke CSV. */
  function handleExport() {
    if (transactions.length === 0) {
      message.warning(t("io.noDataExport"));
      return;
    }
    const csv = generateTransactionsCsv(transactions, categories);
    downloadCsv(csv, "transaksi.csv");
  }

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

  const uploadProps: UploadProps = {
    accept: ".csv",
    showUploadList: false,
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
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
      };
      reader.readAsText(file);
      return false; // prevent auto upload
    },
  };

  return (
    <Space size="small" wrap>
      <Tooltip title={t("io.templateTooltip")}>
        <Button
          size="small"
          shape="round"
          icon={<DownloadOutlined />}
          onClick={handleDownloadTemplate}
        >
          <span className="hidden md:inline">{t("io.template")}</span>
        </Button>
      </Tooltip>
      <Tooltip title={t("io.exportTooltip")}>
        <Button
          size="small"
          shape="round"
          icon={<FileExcelOutlined />}
          onClick={handleExport}
          disabled={transactions.length === 0}
        >
          <span className="hidden md:inline">{t("io.export")}</span>
        </Button>
      </Tooltip>
      <Upload {...uploadProps}>
        <Tooltip title={t("io.importTooltip")}>
          <Button
            size="small"
            shape="round"
            icon={<UploadOutlined />}
            loading={importing}
            type="primary"
            ghost
          >
            <span className="hidden md:inline">{t("io.import")}</span>
          </Button>
        </Tooltip>
      </Upload>
    </Space>
  );
}

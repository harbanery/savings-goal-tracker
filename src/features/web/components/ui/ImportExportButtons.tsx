"use client";

import {
  DownloadOutlined,
  FileExcelOutlined,
  SwapOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { App, Button, Dropdown, Tooltip, Upload } from "antd";
import type { MenuProps, UploadProps } from "antd";
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

/**
 * Satu dropdown berisi Download Template, Export CSV, dan Import CSV
 * (kompatibel Google Sheets). Diposisikan di samping kiri tombol
 * Tambah Transaksi di luar tabel.
 */
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

  /** Item menu: template, export, import (import dibungkus Upload). */
  const items: MenuProps["items"] = [
    {
      key: "template",
      icon: <DownloadOutlined />,
      label: t("io.template"),
      title: t("io.templateTooltip"),
    },
    {
      key: "export",
      icon: <FileExcelOutlined />,
      label: t("io.export"),
      disabled: transactions.length === 0,
      title: t("io.exportTooltip"),
    },
    {
      key: "import",
      icon: <UploadOutlined />,
      label: <Upload {...uploadProps}>{t("io.import")}</Upload>,
      title: t("io.importTooltip"),
    },
  ];

  return (
    <Dropdown
      menu={{
        items,
        onClick: ({ key }) => {
          if (key === "template") handleDownloadTemplate();
          if (key === "export") handleExport();
        },
      }}
      placement="bottomRight"
      trigger={["click"]}
    >
      <Tooltip title={t("io.importTooltip")}>
        <Button icon={<SwapOutlined />} loading={importing}>
          {t("io.menu")}
        </Button>
      </Tooltip>
    </Dropdown>
  );
}

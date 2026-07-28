"use client";

import {
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import { Button, message, Space, Tooltip, Upload } from "antd";
import type { UploadProps } from "antd";
import { useState } from "react";
import { importPurchasesAction } from "@/server/actions";
import { generatePurchasesCsv, generateTemplateCsv, parseCsvToPurchases } from "@/utils/csv";
import type { Purchase } from "@/models/types";

interface Props {
  purchases: Purchase[];
  onImported: () => void;
}

/** Tombol Download Template, Export CSV, dan Import CSV (kompatibel Google Sheets). */
export default function ImportExportButtons({
  purchases,
  onImported,
}: Props) {
  const [importing, setImporting] = useState(false);

  /** Download template CSV kosong (dengan contoh 1 baris). */
  function handleDownloadTemplate() {
    const csv = generateTemplateCsv();
    downloadCsv(csv, "template-pembelian.csv");
  }

  /** Export pembelian siklus aktif ke CSV. */
  function handleExport() {
    if (purchases.length === 0) {
      message.warning("Belum ada pembelian untuk diexport.");
      return;
    }
    const csv = generatePurchasesCsv(purchases);
    downloadCsv(csv, "pembelian.csv");
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
          message.error("File kosong atau tidak terbaca.");
          return;
        }
        const { valid, errors } = parseCsvToPurchases(text);
        if (valid.length === 0) {
          message.error(
            `Tidak ada baris valid. ${errors.length} error: ${errors[0] ?? ""}`,
          );
          return;
        }
        setImporting(true);
        try {
          const result = await importPurchasesAction(valid);
          if (result.imported > 0) {
            message.success(
              `${result.imported} pembelian berhasil diimport.` +
                (result.errors.length > 0
                  ? ` ${result.errors.length} baris dilewati.`
                  : ""),
            );
            onImported();
          } else {
            message.error("Tidak ada pembelian yang berhasil diimport.");
          }
        } catch (err) {
          message.error("Gagal import: " + (err instanceof Error ? err.message : String(err)));
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
      <Tooltip title="Download template CSV (untuk Google Sheets)">
        <Button
          size="small"
          icon={<DownloadOutlined />}
          onClick={handleDownloadTemplate}
        >
          <span className="hidden md:inline">Template</span>
        </Button>
      </Tooltip>
      <Tooltip title="Export pembelian ke CSV">
        <Button
          size="small"
          icon={<FileExcelOutlined />}
          onClick={handleExport}
          disabled={purchases.length === 0}
        >
          <span className="hidden md:inline">Export</span>
        </Button>
      </Tooltip>
      <Upload {...uploadProps}>
        <Tooltip title="Import CSV dari Google Sheets">
          <Button
            size="small"
            icon={<UploadOutlined />}
            loading={importing}
            type="primary"
            ghost
          >
            <span className="hidden md:inline">Import</span>
          </Button>
        </Tooltip>
      </Upload>
    </Space>
  );
}

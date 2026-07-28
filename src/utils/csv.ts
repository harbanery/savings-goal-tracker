import { CATEGORIES, CATEGORY_MAP } from "@/models/categories";
import type { Purchase, PurchaseInput } from "@/models/types";

/**
 * Utilitas CSV untuk template download & import (kompatibel Google Sheets).
 * Format kolom: Nama, Kategori, Jumlah, Tanggal, Catatan
 */

const CSV_HEADERS = ["Nama", "Kategori", "Jumlah", "Tanggal", "Catatan"];

/** Escape nilai CSV (quote bila ada koma, quote, atau newline). */
function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate CSV template dengan header + satu baris contoh.
 * Kategori diisi dengan nama label (bukan ID) agar user-friendly.
 */
export function generateTemplateCsv(): string {
  const sampleRow = [
    escapeCsv("Contoh: Makan Siang"),
    escapeCsv(CATEGORIES[0].label),
    "50000",
    "2026-07-25",
    escapeCsv("Makan di warteg"),
  ];
  return [CSV_HEADERS.join(","), sampleRow.join(",")].join("\n");
}

/** Generate CSV dari daftar pembelian untuk export. */
export function generatePurchasesCsv(purchases: Purchase[]): string {
  const rows = purchases.map((p) => {
    const cat = CATEGORY_MAP[p.categoryId];
    const catLabel = cat?.label ?? "";
    const date = p.date.split("T")[0]; // YYYY-MM-DD
    return [
      escapeCsv(p.name),
      escapeCsv(catLabel),
      String(p.amount),
      date,
      escapeCsv(p.note),
    ].join(",");
  });
  return [CSV_HEADERS.join(","), ...rows].join("\n");
}

/**
 * Parse CSV teks menjadi daftar PurchaseInput.
 * Kategori dicocokkan berdasarkan label (case-insensitive) atau ID.
 * Baris dengan error dilewati dan dilaporkan.
 */
export function parseCsvToPurchases(
  csv: string,
): { valid: PurchaseInput[]; errors: string[] } {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length === 0) {
    return { valid: [], errors: ["File kosong"] };
  }

  const errors: string[] = [];
  const valid: PurchaseInput[] = [];

  // Cari baris header: skip bila baris pertama mengandung "Nama"
  const startIndex = /nama/i.test(lines[0]) ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const rowNum = i + 1;

    const cols = parseCsvLine(line);
    if (cols.length < 4) {
      errors.push(`Baris ${rowNum}: kolom tidak lengkap (butuh minimal 4)`);
      continue;
    }

    const [name, catLabel, amountStr, dateStr, note] = cols;
    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.push(`Baris ${rowNum}: nama kosong`);
      continue;
    }

    // Cocokkan kategori berdasarkan label atau ID (case-insensitive)
    const trimmedCat = catLabel.trim().toLowerCase();
    const cat = CATEGORIES.find(
      (c) =>
        c.label.toLowerCase() === trimmedCat ||
        c.id.toLowerCase() === trimmedCat,
    );
    if (!cat) {
      errors.push(`Baris ${rowNum}: kategori "${catLabel}" tidak ditemukan`);
      continue;
    }

    const amount = Number(amountStr.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push(`Baris ${rowNum}: jumlah "${amountStr}" tidak valid`);
      continue;
    }

    // Parse tanggal: support YYYY-MM-DD atau DD/MM/YYYY
    const parsedDate = parseDate(dateStr.trim());
    if (!parsedDate) {
      errors.push(`Baris ${rowNum}: tanggal "${dateStr}" tidak valid`);
      continue;
    }

    valid.push({
      name: trimmedName,
      categoryId: cat.id,
      amount: Math.round(amount),
      note: (note ?? "").trim(),
      date: parsedDate.toISOString(),
    });
  }

  return { valid, errors };
}

/** Parse satu baris CSV yang mungkin mengandung quoted values. */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

/** Parse tanggal dari format YYYY-MM-DD atau DD/MM/YYYY. */
function parseDate(str: string): Date | null {
  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d = new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3]),
    );
    if (!Number.isNaN(d.getTime())) return d;
  }
  // DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const d = new Date(
      Number(dmyMatch[3]),
      Number(dmyMatch[2]) - 1,
      Number(dmyMatch[1]),
    );
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}
